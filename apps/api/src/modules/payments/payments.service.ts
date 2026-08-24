import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuditAction,
  BillingInterval,
  PaymentProvider,
  PaymentStatus,
  PlanStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PacksService } from '../packs/packs.service';
import { findPack } from '../packs/packs.catalog';
import { SmsService } from '../sms/sms.service';
import { VaccinationsService } from '../vaccinations/vaccinations.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { TbcClient } from './tbc.client';

/**
 * ბარათით გადახდა TBC-ის Checkout-ით.
 *
 * მთავარი წესი: გამოწერას *მხოლოდ* ბანკის პასუხი ააქტიურებს.
 * მომხმარებელი ბრუნდება `/payment/result`-ზე, მაგრამ ამ გვერდს არ
 * ვენდობით — მისამართის ხელით აკრეფა ყველას პრემიუმს მისცემდა.
 * ყოველ შემოწმებაზე სერვერი თავად ეკითხება ბანკს რეალურ სტატუსს.
 *
 * გააქტიურების სამი გზაა და სამივე ერთსა და იმავე შემოწმებაზე გადის:
 *   1. დაბრუნების გვერდი ეკითხება ჩვენს backend-ს (2–3 წამში ერთხელ);
 *   2. ბანკის callback — თუ მშობელმა ფანჯარა დახურა;
 *   3. ფონური შემოწმება ყოველ 5 წუთში — თუ callback-იც დაიკარგა.
 */

/** ბანკის საბოლოო სტატუსები — მათ შემდეგ კითხვას აზრი აღარ აქვს. */
const SUCCESS_STATUSES = new Set(['succeeded']);
const FAILED_STATUSES = new Set(['failed', 'expired', 'cancelpaymentprocessing']);

/** რამდენ ხანს ველოდებით დაუსრულებელ გადახდას, სანამ ჩავარდნილად მივიჩნევთ. */
const PENDING_TTL_HOURS = 24;

export interface PaymentView {
  payId: string | null;
  /** დასრულდა თუ არა — `false` ნიშნავს, რომ კიდევ უნდა ვკითხოთ */
  final: boolean;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  planName: string | null;
  validUntil: Date | null;
  message: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tbc: TbcClient,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationsService,
    private readonly packs: PacksService,
    private readonly vaccinations: VaccinationsService,
    private readonly sms: SmsService,
    private readonly audit: AuditService,
  ) {}

  /** ვიტრინას სჭირდება: გასაღებების გარეშე ღილაკს არ ვაჩვენებთ. */
  config$(): { enabled: boolean; provider: 'TBC' } {
    return { enabled: this.tbc.enabled, provider: 'TBC' };
  }

  // ─── გადახდის დაწყება ────────────────────────────────────────────────

  async start(
    dto: CreatePaymentDto,
    userId: string,
  ): Promise<{ orderId: string; payId: string; url: string }> {
    if (dto.packCode) return this.startPack(dto.packCode, userId);
    if (!dto.planCode) throw new BadRequestException('მიუთითეთ პაკეტი');

    const interval = (dto.interval ?? 'MONTH') as BillingInterval;

    const plan = await this.prisma.plan.findFirst({
      where: { code: dto.planCode, status: PlanStatus.ACTIVE, deletedAt: null },
      include: { prices: { where: { isActive: true } } },
    });
    if (!plan) throw new NotFoundException('პაკეტი ვერ მოიძებნა');
    if (plan.isFree) throw new BadRequestException('უფასო პაკეტს გადახდა არ სჭირდება');

    const price = plan.prices.find((item) => item.interval === interval);
    if (!price) throw new BadRequestException('ამ პაკეტს ასეთი ფასი არ აქვს');

    // თანხას აქ ვამაგრებთ და აღარ ვცვლით — დაბრუნებისას სწორედ ამას
    // ვადარებთ ბანკის პასუხს, რომ გზაში შეცვლილი ფასი არ გაგვეპაროს
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        provider: PaymentProvider.TBC,
        status: PaymentStatus.PENDING,
        currency: price.currency,
        amountMinor: price.amountMinor,
        metadata: {
          planId: plan.id,
          planCode: plan.code,
          planName: plan.name,
          planPriceId: price.id,
          interval: price.interval,
          intervalCount: price.intervalCount,
        } as Prisma.InputJsonValue,
      },
    });

    return this.sendToBank(payment.id, price.amountMinor, price.currency, plan.name);
  }

  /**
   * კონსულტაციის ლიმიტის ყიდვა.
   *
   * გამოწერისგან იმით განსხვავდება, რომ არსებულ პაკეტს არ ეხება —
   * წარმატებული გადახდა მხოლოდ ლიმიტს ჩარიცხავს.
   */
  private async startPack(
    packCode: string,
    userId: string,
  ): Promise<{ orderId: string; payId: string; url: string }> {
    const offer = findPack(packCode);
    if (!offer) throw new NotFoundException('პაკეტი ვერ მოიძებნა');

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        provider: PaymentProvider.TBC,
        status: PaymentStatus.PENDING,
        currency: offer.currency,
        amountMinor: offer.amountMinor,
        metadata: {
          kind: 'pack',
          packCode: offer.code,
          planName: `კონსულტაცია — ${offer.name}`,
        } as Prisma.InputJsonValue,
      },
    });

    return this.sendToBank(payment.id, offer.amountMinor, offer.currency, offer.name);
  }

  /** ბანკში შეკვეთის შექმნა — გამოწერასაც და ლიმიტსაც ერთი გზა აქვს. */
  private async sendToBank(
    paymentId: string,
    amountMinor: number,
    currency: string,
    description: string,
  ): Promise<{ orderId: string; payId: string; url: string }> {
    try {
      const created = await this.tbc.createPayment({
        amountMinor,
        currency,
        merchantPaymentId: paymentId,
        description,
        returnUrl: this.returnUrlFor(paymentId),
        callbackUrl: this.callbackUrl,
      });

      if (!created.checkoutUrl) {
        throw new BadRequestException('ბანკმა გადახდის გვერდი არ დააბრუნა');
      }

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { providerPaymentId: created.payId },
      });

      return { orderId: paymentId, payId: created.payId, url: created.checkoutUrl };
    } catch (error) {
      // დაწყებამდე ჩავარდნილი გადახდა რიგში არ უნდა დარჩეს
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'უცნობი შეცდომა',
        },
      });
      throw error;
    }
  }

  // ─── სტატუსის შემოწმება ──────────────────────────────────────────────

  /** მშობლის მოთხოვნა — მხოლოდ საკუთარ გადახდას ხედავს. */
  async status(reference: string, userId: string): Promise<PaymentView> {
    const payment = await this.prisma.payment.findFirst({ where: this.byReference(reference) });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('გადახდა ვერ მოიძებნა');
    }

    return this.verify(reference);
  }

  /**
   * ერთადერთი ადგილი, სადაც გადახდა მოწმდება და გამოწერა აქტიურდება.
   * უსაფრთხოა მრავალჯერ გამოძახება — უკვე დადასტურებულს ხელახლა არ ეხება.
   */
  async verify(reference: string): Promise<PaymentView> {
    const payment = await this.prisma.payment.findFirst({
      where: this.byReference(reference),
      include: { subscription: { include: { plan: { select: { name: true } } } } },
    });
    if (!payment) throw new NotFoundException('გადახდა ვერ მოიძებნა');

    const meta = (payment.metadata ?? {}) as Record<string, string | number>;
    const planName = (meta.planName as string) ?? payment.subscription?.plan.name ?? null;

    // უკვე დათვლილი გადახდა ბანკს აღარ ვკითხოთ
    if (payment.status !== PaymentStatus.PENDING) {
      return this.view(payment.status, payment, planName, payment.subscription?.currentPeriodEnd);
    }

    // payId-ის გარეშე ბანკს ვერაფერს ვკითხავთ — შეკვეთა შექმნისას ჩავარდა
    if (!payment.providerPaymentId) {
      return this.view(PaymentStatus.PENDING, payment, planName, null);
    }

    const remote = await this.tbc.getPayment(payment.providerPaymentId);
    const status = remote.status?.toLowerCase() ?? '';

    if (SUCCESS_STATUSES.has(status)) {
      // თანხა და ვალუტა ჩვენს შეკვეთას უნდა ემთხვეოდეს
      const paidMinor = Math.round(remote.amount * 100);
      const mismatch =
        paidMinor !== payment.amountMinor ||
        remote.currency?.toUpperCase() !== payment.currency.toUpperCase();

      if (mismatch) {
        this.logger.error(
          `გადახდა ${payment.providerPaymentId}: ველოდით ${payment.amountMinor} ${payment.currency}, ` +
            `მივიღეთ ${paidMinor} ${remote.currency}`,
        );
        await this.fail(payment.id, 'თანხა შეკვეთას არ ემთხვევა');
        return this.view(PaymentStatus.FAILED, payment, planName, null);
      }

      const validUntil = await this.activate(payment.id, remote.transactionId);
      return this.view(PaymentStatus.SUCCEEDED, payment, planName, validUntil);
    }

    if (FAILED_STATUSES.has(status)) {
      await this.fail(payment.id, `ბანკის სტატუსი: ${remote.status}`);
      return this.view(PaymentStatus.FAILED, payment, planName, null);
    }

    // Created / Processing / WaitingConfirm — ჯერ არ დასრულებულა
    return this.view(PaymentStatus.PENDING, payment, planName, null);
  }

  /**
   * ბანკის callback. TBC-იც კი გვირჩევს, რომ callback-ს არ დავენდოთ და
   * სტატუსი ხელახლა ვკითხოთ — ზუსტად ამას აკეთებს `verify`.
   */
  async handleCallback(payId: string | undefined): Promise<{ received: true }> {
    if (payId) {
      await this.verify(payId).catch((error: Error) =>
        this.logger.error(`callback ${payId}: ${error.message}`),
      );
    }
    return { received: true };
  }

  /** შეკვეთა ორივე ნომრით უნდა მოიძებნოს: ჩვენით და ბანკისით. */
  private byReference(reference: string): Prisma.PaymentWhereInput {
    return { OR: [{ id: reference }, { providerPaymentId: reference }] };
  }

  /** მშობლის გადახდების ისტორია. */
  async history(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { subscription: { include: { plan: { select: { name: true } } } } },
    });

    return payments.map((payment) => {
      const meta = (payment.metadata ?? {}) as Record<string, string>;
      return {
        id: payment.id,
        status: payment.status,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        planName: meta.planName ?? payment.subscription?.plan.name ?? null,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      };
    });
  }

  // ─── ფონური შემოწმება ────────────────────────────────────────────────

  /**
   * გადახდილი, მაგრამ დაუთვლელი შეკვეთების დაჭერა: მშობელმა ფანჯარა
   * დახურა და callback-იც არ მოვიდა. ამის გარეშე ფული ჩამოეჭრებოდა და
   * პაკეტი არ გააქტიურდებოდა.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepPending(): Promise<void> {
    if (!this.tbc.enabled) return;

    const since = new Date(Date.now() - PENDING_TTL_HOURS * 60 * 60 * 1000);

    const stale = await this.prisma.payment.findMany({
      where: {
        provider: PaymentProvider.TBC,
        status: PaymentStatus.PENDING,
        providerPaymentId: { not: null },
        createdAt: { gte: since },
      },
      select: { providerPaymentId: true },
      take: 50,
    });

    for (const payment of stale) {
      await this.verify(payment.providerPaymentId!).catch((error: Error) =>
        this.logger.warn(`ფონური შემოწმება ${payment.providerPaymentId}: ${error.message}`),
      );
    }

    // ბანკამდე რომ ვერ მივიდა — რიგში სამუდამოდ არ უნდა დარჩეს
    await this.prisma.payment.updateMany({
      where: {
        provider: PaymentProvider.TBC,
        status: PaymentStatus.PENDING,
        createdAt: { lt: since },
      },
      data: { status: PaymentStatus.CANCELED, failureReason: 'ვადა ამოიწურა' },
    });
  }

  // ─── გააქტიურება ─────────────────────────────────────────────────────

  /**
   * გამოწერის გააქტიურება. აბრუნებს ვადის დასასრულს.
   *
   * ორჯერ გააქტიურება შეუძლებელია: სტატუსს PENDING → SUCCEEDED მხოლოდ
   * პირობით ვცვლით და თუ ჩანაწერი აღარ იყო PENDING, ხელს აღარ ვახლებთ.
   */
  private async activate(paymentId: string, transactionId: string | null): Promise<Date | null> {
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          failureReason: null,
        },
      });

      // სხვამ დაასწრო (callback და გვერდი ერთდროულად) — მეორე გამოწერას არ ვქმნით
      if (!claimed.count) return null;

      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      const meta = (payment.metadata ?? {}) as Record<string, string | number>;

      // ლიმიტის პაკეტი გამოწერას არ ეხება — მას ტრანზაქციის შემდეგ ვრიცხავთ
      if (meta.kind === 'pack') {
        await tx.payment.update({
          where: { id: paymentId },
          data: { metadata: { ...meta, transactionId } as Prisma.InputJsonValue },
        });
        return { kind: 'pack' as const, packCode: String(meta.packCode), userId: payment.userId! };
      }

      const planId = meta.planId as string;
      const planPriceId = (meta.planPriceId as string) ?? null;
      const interval = (meta.interval as BillingInterval) ?? BillingInterval.MONTH;
      const count = Number(meta.intervalCount ?? 1) || 1;

      const now = new Date();

      // იმავე პაკეტის ვადამდე გახანგრძლივებისას დარჩენილი დღეები არ იკარგება
      const same = await tx.subscription.findFirst({
        where: {
          userId: payment.userId!,
          planId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
          currentPeriodEnd: { gt: now },
        },
        orderBy: { currentPeriodEnd: 'desc' },
      });

      const start = same?.currentPeriodEnd ?? now;
      const end = addMonths(start, interval === BillingInterval.YEAR ? 12 * count : count);

      // ერთდროულად ერთი აქტიური გამოწერა
      await tx.subscription.updateMany({
        where: {
          userId: payment.userId!,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
        data: { status: SubscriptionStatus.CANCELED, canceledAt: now },
      });

      const subscription = await tx.subscription.create({
        data: {
          userId: payment.userId!,
          planId,
          planPriceId,
          status: SubscriptionStatus.ACTIVE,
          startedAt: same?.startedAt ?? now,
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
        include: { plan: { select: { code: true, name: true } } },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          subscriptionId: subscription.id,
          metadata: { ...meta, transactionId } as Prisma.InputJsonValue,
        },
      });

      return {
        kind: 'subscription' as const,
        userId: payment.userId!,
        amountMinor: payment.amountMinor,
        subscriptionId: subscription.id,
        planCode: subscription.plan.code,
        planName: subscription.plan.name,
        end: subscription.currentPeriodEnd!,
      };
    });

    if (!result) {
      const existing = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { subscription: true },
      });
      return existing?.subscription?.currentPeriodEnd ?? null;
    }

    if (result.kind === 'pack') {
      const granted = await this.packs.grant(result.userId, result.packCode, paymentId);

      await this.notifications
        .push({
          userId: result.userId,
          title: 'კონსულტაციის ლიმიტი ჩაირიცხა',
          body:
            `${granted.chatLimit} საუბარი ხელმისაწვდომია `
            + `${formatDate(granted.expiresAt)}-მდე.`,
        })
        .catch(() => undefined);

      return granted.expiresAt;
    }

    const { userId, amountMinor, subscriptionId, planCode, planName, end } = result;

    this.entitlements.invalidate(userId);

    await this.audit.record({
      actorId: userId,
      action: AuditAction.GRANT,
      entityType: 'Subscription',
      entityId: subscriptionId,
      after: { plan: planCode, validUntil: end },
      description:
        `"${planCode}" გააქტიურდა ბარათით — ` +
        `${(amountMinor / 100).toFixed(2)} ₾, ტრანზაქცია ${transactionId ?? '—'}`,
    });

    await this.tellParent(userId, planName, end);

    // ახალ პაკეტში აცრების კალენდარიც შედის — ისტორიის შევსება ვთხოვოთ
    await this.vaccinations.promptHistory(userId).catch(() => undefined);

    return end;
  }

  private async fail(paymentId: string, reason: string): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED, failureReason: reason },
    });
  }

  private async tellParent(userId: string, planName: string, validUntil: Date): Promise<void> {
    const until = formatDate(validUntil);

    await this.notifications
      .push({
        userId,
        title: 'პაკეტი გააქტიურდა',
        body: `"${planName}" აქტიურია ${until}-მდე. სასიამოვნო სარგებლობას გისურვებთ!`,
        data: { plan: planName, validUntil: validUntil.toISOString() },
      })
      .catch(() => undefined);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (user?.phone) {
      await this.sms
        .send({
          userId,
          phone: user.phone,
          templateKey: 'payment_success',
          body: `AskDrTeo: გადახდა დადასტურდა. პაკეტი "${planName}" აქტიურია ${until}-მდე.`,
        })
        .catch(() => undefined);
    }
  }

  // ─── დამხმარე ────────────────────────────────────────────────────────

  /**
   * ბანკი დაბრუნების მისამართს პარამეტრებს არ ამატებს, ამიტომ ჩვენს
   * შეკვეთის ნომერს თავად ვაყოლებთ — თორემ გვერდი ვერ გაიგებდა,
   * რომელი გადახდა შეამოწმოს.
   */
  private returnUrlFor(orderId: string): string {
    const url = new URL(this.config.get<string>('payments.tbc.returnUrl')!);
    url.searchParams.set('order', orderId);
    return url.toString();
  }

  /**
   * ბანკი callback-ს მხოლოდ საჯარო https მისამართზე გამოგზავნის —
   * ლოკალურად მისი გაგზავნა უაზროა და ბანკის მხრიდან შეცდომას იწვევს.
   */
  private get callbackUrl(): string | undefined {
    const base = this.config.get<string>('publicUrl') ?? '';
    const prefix = this.config.get<string>('apiPrefix') ?? 'api/v1';
    const url = `${base.replace(/\/$/, '')}/${prefix}/payments/tbc/callback`;

    return url.startsWith('https://') ? url : undefined;
  }

  private view(
    status: PaymentStatus,
    payment: { providerPaymentId: string | null; amountMinor: number; currency: string },
    planName: string | null,
    validUntil?: Date | null,
  ): PaymentView {
    const messages: Record<PaymentStatus, string> = {
      PENDING: 'გადახდა მუშავდება — გთხოვთ, დაელოდოთ',
      SUCCEEDED: planName
        ? `გადახდა დადასტურდა. "${planName}" გააქტიურდა`
        : 'გადახდა დადასტურდა',
      FAILED: 'გადახდა ვერ შესრულდა — თანხა არ ჩამოგეჭრათ',
      CANCELED: 'გადახდა გაუქმდა',
      REFUNDED: 'თანხა დაბრუნდა',
    };

    return {
      payId: payment.providerPaymentId,
      final: status !== PaymentStatus.PENDING,
      status,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      planName,
      validUntil: validUntil ?? null,
      message: messages[status],
    };
  }
}

/**
 * თვეების მიმატება თარიღის „გადავარდნის" გარეშე.
 *
 * `setMonth`-ს 31 იანვარს + 1 თვე 3 მარტში გადააქვს; გამოწერაში ეს
 * მშობელს მოპარულ დღედ ჩაეთვლება. ბოლო რიცხვს თვის ბოლოზე ვამაგრებთ.
 */
function addMonths(from: Date, months: number): Date {
  const result = new Date(from);
  const day = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));

  return result;
}

function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}
