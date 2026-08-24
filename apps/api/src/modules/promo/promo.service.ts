import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  PromoType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { VaccinationsService } from '../vaccinations/vaccinations.service';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { VideoVisitsService } from '../video-visits/video-visits.service';
import { CreatePromoDto, UpdatePromoDto } from './dto/promo.dto';

export interface RedeemResult {
  type: PromoType;
  message: string;
  /** FREE_PLAN-ისთვის — მინიჭებული პაკეტი და ვადა */
  planName?: string;
  validUntil?: Date;
  /** DISCOUNT-ისთვის — პროცენტი, რომელიც გადახდისას გამოიყენება */
  discountPercent?: number;
  /** FREE_VIDEO_VISIT-ისთვის — რამდენი უფასო ვიზიტი ჩაირიცხა */
  visitCredits?: number;
}

@Injectable()
export class PromoService {
  constructor(
    private readonly vaccinations: VaccinationsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
    private readonly videoVisits: VideoVisitsService,
  ) {}

  // ─── ადმინი ──────────────────────────────────────────────────────────

  list() {
    return this.prisma.promoCode.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { code: true, name: true } },
        _count: { select: { redemptions: true } },
      },
    });
  }

  async create(dto: CreatePromoDto, actorId: string) {
    const code = dto.code.trim().toUpperCase();

    const exists = await this.prisma.promoCode.findUnique({ where: { code } });
    if (exists) throw new ConflictException(`კოდი "${code}" უკვე არსებობს`);

    this.assertTypeConsistency(dto);

    // FREE_PLAN-ისთვის პაკეტის არსებობა წინასწარ უნდა შემოწმდეს, თორემ
    // კოდი შეიქმნება და გამოსყიდვისას ჩავარდება
    if (dto.type === PromoType.FREE_PLAN) {
      const plan = await this.prisma.plan.findFirst({
        where: { code: dto.planCode, deletedAt: null },
      });
      if (!plan) throw new BadRequestException(`პაკეტი "${dto.planCode}" ვერ მოიძებნა`);
      dto.planCode = plan.id; // ქვემოთ planId-ად გამოიყენება
    }

    const promo = await this.prisma.promoCode.create({
      data: {
        code,
        type: dto.type,
        description: dto.description,
        discountPercent: dto.discountPercent,
        planId: dto.type === PromoType.FREE_PLAN ? dto.planCode : null,
        freeDays: dto.freeDays,
        // რამდენი უფასო ვიზიტი მიიღოს მშობელმა ამ კოდით
        visitCount: dto.type === PromoType.FREE_VIDEO_VISIT ? (dto.visitCount ?? 1) : null,
        validFrom: dto.validFrom ?? new Date(),
        validUntil: dto.validUntil,
        maxRedemptions: dto.maxRedemptions,
        oncePerUser: dto.oncePerUser ?? true,
        createdById: actorId,
      },
      include: { plan: { select: { code: true, name: true } } },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'PromoCode',
      entityId: promo.id,
      after: promo,
      description: `პრომო კოდი: ${code} (${promo.type})`,
    });

    return promo;
  }

  async update(id: string, dto: UpdatePromoDto, actorId: string) {
    const before = await this.findOne(id);

    const promo = await this.prisma.promoCode.update({
      where: { id },
      data: {
        description: dto.description,
        validUntil: dto.validUntil,
        maxRedemptions: dto.maxRedemptions,
        isActive: dto.isActive,
      },
      include: { plan: { select: { code: true, name: true } } },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'PromoCode',
      entityId: id,
      before: { isActive: before.isActive, validUntil: before.validUntil },
      after: { isActive: promo.isActive, validUntil: promo.validUntil },
    });

    return promo;
  }

  /**
   * კოდის წაშლა.
   *
   * რბილია: გამოსყიდვების ისტორია კოდზე მიუთითებს და ფიზიკური წაშლა
   * გაწყვეტდა — ვეღარ ნახავდი, ვინ რა კოდით მიიღო პაკეტი.
   */
  async remove(id: string, actorId: string) {
    const promo = await this.findOne(id);

    await this.prisma.promoCode.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'PromoCode',
      entityId: id,
      before: { code: promo.code, redeemedCount: promo.redeemedCount },
      description: `პრომო კოდი წაშლილია: ${promo.code}`,
    });

    return { message: 'პრომო კოდი წაშლილია', id };
  }

  // ─── მშობელი ─────────────────────────────────────────────────────────

  /**
   * კოდის გამოსყიდვა.
   *
   * ყველა შემოწმება ერთ ტრანზაქციაშია: ორი პარალელური მოთხოვნა
   * ლიმიტს ვერ გადააჭარბებს.
   */
  async redeem(userId: string, rawCode: string): Promise<RedeemResult> {
    const code = rawCode.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const promo = await tx.promoCode.findFirst({
        where: { code, deletedAt: null },
        include: { plan: true },
      });

      if (!promo) throw new NotFoundException('კოდი ვერ მოიძებნა');
      if (!promo.isActive) throw new BadRequestException('კოდი აღარ არის აქტიური');

      const now = new Date();
      if (promo.validFrom > now) {
        throw new BadRequestException('კოდი ჯერ არ არის აქტიური');
      }
      if (promo.validUntil && promo.validUntil < now) {
        throw new BadRequestException('კოდის ვადა ამოიწურა');
      }
      if (promo.maxRedemptions !== null && promo.redeemedCount >= promo.maxRedemptions) {
        throw new BadRequestException('კოდის გამოყენების ლიმიტი ამოიწურა');
      }

      if (promo.oncePerUser) {
        const used = await tx.promoRedemption.findUnique({
          where: { promoId_userId: { promoId: promo.id, userId } },
        });
        if (used) throw new BadRequestException('ეს კოდი უკვე გამოგიყენებიათ');
      }

      let subscriptionId: string | undefined;
      let result: RedeemResult;

      if (promo.type === PromoType.FREE_PLAN) {
        if (!promo.plan) throw new BadRequestException('კოდს პაკეტი არ აქვს მიბმული');

        const days = promo.freeDays ?? 30;
        const periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        // ერთდროულად ერთი აქტიური გამოწერა
        await tx.subscription.updateMany({
          where: {
            userId,
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
          },
          data: { status: SubscriptionStatus.CANCELED, canceledAt: now },
        });

        const subscription = await tx.subscription.create({
          data: {
            userId,
            planId: promo.plan.id,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: periodEnd,
            grantedNote: `პრომო კოდი: ${promo.code}`,
          },
        });

        subscriptionId = subscription.id;
        result = {
          type: promo.type,
          message: `"${promo.plan.name}" გააქტიურდა ${days} დღით`,
          planName: promo.plan.name,
          validUntil: periodEnd,
        };
      } else if (promo.type === PromoType.FREE_VIDEO_VISIT) {
        // ვიზიტს ახლა არ ვქმნით — მშობელს ჯერ დღე უნდა აირჩიოს.
        // კოდი უფლებას რიცხავს და ჯავშნისას ის გადახდას ცვლის.
        const count = promo.visitCount ?? 1;

        for (let index = 0; index < count; index += 1) {
          await this.videoVisits.grantCredit(
            userId,
            'promo',
            `პრომო კოდი: ${promo.code}`,
            promo.freeDays ?? undefined,
          );
        }

        result = {
          type: promo.type,
          message:
            count === 1
              ? 'უფასო ვიდეო ვიზიტი ჩაირიცხა — აირჩიეთ სასურველი დღე'
              : `${count} უფასო ვიდეო ვიზიტი ჩაირიცხა`,
          visitCredits: count,
        };
      } else {
        // ფასდაკლება გადახდისას გამოიყენება — გამოწერას ახლა არ ვცვლით
        result = {
          type: promo.type,
          message: `ფასდაკლება ${promo.discountPercent}% გააქტიურდა`,
          discountPercent: promo.discountPercent ?? undefined,
        };
      }

      await tx.promoRedemption.create({
        data: { promoId: promo.id, userId, subscriptionId },
      });
      // ლიმიტის ამოწურვისას კოდი თავად ითიშება — თორემ სიაში „აქტიურად"
      // ჩანდებოდა, გამოსყიდვა კი ჩავარდებოდა.
      const reachedLimit =
        promo.maxRedemptions !== null && promo.redeemedCount + 1 >= promo.maxRedemptions;

      await tx.promoCode.update({
        where: { id: promo.id },
        data: {
          redeemedCount: { increment: 1 },
          ...(reachedLimit ? { isActive: false } : {}),
        },
      });

      // ტრანზაქციის შემდეგ უფლებები შეიცვალა
      this.entitlements.invalidate(userId);

      // ახალ პაკეტში აცრების კალენდარიც შედის — ისტორიის შევსება ვთხოვოთ
      await this.vaccinations.promptHistory(userId).catch(() => undefined);

      return result;
    });
  }

  private async findOne(id: string) {
    const promo = await this.prisma.promoCode.findFirst({ where: { id, deletedAt: null } });
    if (!promo) throw new NotFoundException('კოდი ვერ მოიძებნა');
    return promo;
  }

  /** ტიპისთვის აუცილებელი ველების შემოწმება. */
  private assertTypeConsistency(dto: CreatePromoDto): void {
    if (dto.type === PromoType.DISCOUNT && !dto.discountPercent) {
      throw new BadRequestException('ფასდაკლების კოდს პროცენტი სჭირდება');
    }
    if (dto.type === PromoType.FREE_VIDEO_VISIT && dto.visitCount !== undefined
        && dto.visitCount < 1) {
      throw new BadRequestException('ვიზიტების რაოდენობა ერთზე ნაკლები ვერ იქნება');
    }
    if (dto.type === PromoType.FREE_PLAN && !dto.planCode) {
      throw new BadRequestException('უფასო პაკეტის კოდს პაკეტი სჭირდება');
    }
  }
}

export type { Prisma };
