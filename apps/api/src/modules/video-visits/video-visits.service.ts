import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConversationKind, UserRole, VideoVisitStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  addDays,
  formatTbilisi,
  tbilisiDayKey,
  tbilisiStartOfDay,
} from '@/common/utils/tbilisi-time';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';
import { AgoraService } from './agora.service';
import {
  BE_READY_MINUTES,
  BOOKING_HORIZON_DAYS,
  DAILY_CAPACITY,
  JOIN_CLOSES_MINUTES,
  JOIN_OPENS_MINUTES,
  LATE_AFTER_MINUTES,
  LATE_COVER_PERCENT,
  REMINDER_BEFORE_MINUTES,
  VISIT_PRICE_MINOR,
} from './video-visits.config';
import { CancelVideoVisitDto, ScheduleVideoVisitDto } from './dto/video-visit.dto';

/**
 * რამდენი წამი ჩაითვლება მხარე „ოთახში მყოფად" ბოლო ნიშნიდან.
 *
 * ფანჯრის დახურვას სერვერი ვერ ხედავს — ამიტომ ყოფნა ვადიანია და
 * ყოველ გამოკითხვაზე ახლდება. 20 წამი სამ გამოტოვებულ ნიშანს იტანს.
 */
const PRESENCE_TTL_MS = 20_000;

/** დღეები, რომლებზეც ჯავშანი შეიძლება ჯერ კიდევ შედგეს. */
const LIVE_STATUSES: VideoVisitStatus[] = [
  VideoVisitStatus.REQUESTED,
  VideoVisitStatus.SCHEDULED,
  VideoVisitStatus.LIVE,
];

@Injectable()
export class VideoVisitsService {
  private readonly logger = new Logger(VideoVisitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly sms: SmsService,
    private readonly agora: AgoraService,
  ) {}

  // ─── მშობელი ─────────────────────────────────────────────────────

  /**
   * უახლოესი დღეების ტევადობა.
   *
   * მშობელს კალენდარში მაშინვე უნდა უჩანდეს, რომელი დღე ივსება —
   * თორემ გადახდის შემდეგ „ადგილი აღარ არის" ყველაზე ცუდი პასუხია.
   */
  async availability() {
    const from = tbilisiStartOfDay(new Date());
    const to = addDays(from, BOOKING_HORIZON_DAYS);

    const rows = await this.prisma.videoVisit.groupBy({
      by: ['requestedDate'],
      where: {
        deletedAt: null,
        status: { in: LIVE_STATUSES },
        requestedDate: { gte: from, lt: to },
      },
      _count: { _all: true },
    });

    const taken = new Map(rows.map((row) => [tbilisiDayKey(row.requestedDate), row._count._all]));

    return Array.from({ length: BOOKING_HORIZON_DAYS }, (_, index) => {
      const date = addDays(from, index);
      const used = taken.get(tbilisiDayKey(date)) ?? 0;

      return {
        date: tbilisiDayKey(date),
        capacity: DAILY_CAPACITY,
        used,
        free: Math.max(0, DAILY_CAPACITY - used),
      };
    });
  }

  /** დღეზე ადგილის შემოწმება — გადახდის დაწყებამდეც და ჩარიცხვამდეც. */
  async assertDayFree(date: Date): Promise<void> {
    const day = tbilisiStartOfDay(date);

    if (day.getTime() < tbilisiStartOfDay(new Date()).getTime()) {
      throw new BadRequestException('არჩეული დღე უკვე გასულია');
    }
    if (day.getTime() > addDays(tbilisiStartOfDay(new Date()), BOOKING_HORIZON_DAYS).getTime()) {
      throw new BadRequestException('ამ დღეზე ჯავშანი ჯერ არ იხსნება');
    }

    const used = await this.prisma.videoVisit.count({
      where: {
        deletedAt: null,
        status: { in: LIVE_STATUSES },
        requestedDate: day,
      },
    });

    if (used >= DAILY_CAPACITY) {
      throw new BadRequestException('ამ დღეს ადგილები ამოიწურა — აირჩიეთ სხვა დღე');
    }
  }

  /** გამოუყენებელი უფასო ვიზიტები — პრომო კოდიდან ან ხელით გაცემული. */
  async credits(userId: string) {
    const now = new Date();

    return this.prisma.videoVisitCredit.findMany({
      where: {
        userId,
        usedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ coverPercent: 'desc' }, { expiresAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** უფასო ვიზიტის უფლების ჩარიცხვა — პრომო კოდი ამას იძახებს. */
  async grantCredit(
    userId: string,
    source: string,
    note?: string,
    days?: number,
    coverPercent = 100,
  ) {
    return this.prisma.videoVisitCredit.create({
      data: {
        userId,
        source,
        note,
        coverPercent,
        expiresAt: days ? addDays(new Date(), days) : null,
      },
    });
  }

  /**
   * რა ფასი დახვდება მშობელს ახლა.
   *
   * უპირატესობა სრულ უფლებას აქვს — ნაწილობრივი უფლება მაშინ
   * გამოიყენება, როცა უფასო აღარ დარჩა.
   */
  async priceFor(userId: string): Promise<{
    amountMinor: number;
    creditId: string | null;
    coverPercent: number;
  }> {
    const [best] = (await this.credits(userId)).sort(
      (a, b) => b.coverPercent - a.coverPercent,
    );

    if (!best) return { amountMinor: VISIT_PRICE_MINOR, creditId: null, coverPercent: 0 };

    const amountMinor = Math.round(
      (VISIT_PRICE_MINOR * (100 - best.coverPercent)) / 100,
    );

    return { amountMinor, creditId: best.id, coverPercent: best.coverPercent };
  }

  /** ფასდაკლების უფლების დახარჯვა — გადახდილი ჯავშნის შემდეგ. */
  async consumeCredit(creditId: string, visitId: string): Promise<void> {
    await this.prisma.videoVisitCredit.updateMany({
      where: { id: creditId, usedAt: null },
      data: { usedAt: new Date(), visitId },
    });
  }

  /**
   * ჯავშანი უფასო უფლებით — გადახდის გარეშე.
   *
   * უფლება ჯავშნის შექმნასთან ერთად იხარჯება, ერთ ტრანზაქციაში:
   * ორი პარალელური მოთხოვნა ერთსა და იმავე უფლებით ორ ვიზიტს ვერ
   * შექმნის.
   */
  async bookWithCredit(input: {
    parentId: string;
    date: Date;
    childId?: string | null;
    reason?: string | null;
  }) {
    const [credit] = await this.credits(input.parentId);
    if (!credit) throw new BadRequestException('უფასო ვიზიტის უფლება არ გაქვთ');
    if (credit.coverPercent < 100) {
      throw new BadRequestException('თქვენი უფლება ფასდაკლებაა — ჯავშანი გადახდით გრძელდება');
    }

    const claimed = await this.prisma.videoVisitCredit.updateMany({
      where: { id: credit.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (!claimed.count) throw new BadRequestException('უფლება უკვე გამოყენებულია');

    try {
      const visit = await this.grant(input);

      await this.prisma.videoVisitCredit.update({
        where: { id: credit.id },
        data: { visitId: visit.id },
      });

      return visit;
    } catch (error) {
      // ჯავშანი ვერ შეიქმნა — უფლება მშობელს უნდა დარჩეს
      await this.prisma.videoVisitCredit.update({
        where: { id: credit.id },
        data: { usedAt: null },
      });
      throw error;
    }
  }

  /** გადახდის დადასტურების შემდეგ — ჯავშნის შექმნა. */
  async grant(input: {
    parentId: string;
    date: Date;
    childId?: string | null;
    reason?: string | null;
    paymentId?: string;
  }) {
    const day = tbilisiStartOfDay(input.date);
    await this.assertDayFree(day);

    const visit = await this.prisma.videoVisit.create({
      data: {
        parentId: input.parentId,
        childId: input.childId ?? null,
        requestedDate: day,
        reason: input.reason ?? null,
        roomName: `askdrteo-${randomBytes(9).toString('hex')}`,
        paymentId: input.paymentId,
      },
    });

    await this.notifications
      .push({
        userId: input.parentId,
        title: 'ვიდეო ვიზიტი დაჯავშნილია',
        body: `${tbilisiDayKey(day)} — ექიმი ზუსტ საათს დანიშნავს და შეგატყობინებთ.`,
        data: { videoVisitId: visit.id },
      })
      .catch(() => undefined);

    await this.notifyStaff(visit.id, day);

    return visit;
  }

  async listForParent(parentId: string) {
    const visits = await this.prisma.videoVisit.findMany({
      where: { parentId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { child: { select: { id: true, firstName: true } } },
    });

    return visits.map((visit) => this.parentView(visit));
  }

  /**
   * მშობლის მხრიდან ჩართვა.
   *
   * ოთახი დანიშნულ საათს უკავშირდება: ღილაკის დამალვა კლიენტში
   * საკმარისი არ არის — მისამართის პირდაპირ გახსნაც უნდა შეჩერდეს.
   */
  async joinAsParent(id: string, parentId: string) {
    const visit = await this.prisma.videoVisit.findFirst({
      where: { id, parentId, deletedAt: null },
      include: { parent: { select: { firstName: true, lastName: true } } },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');

    const window = joinWindow(visit.status, visit.scheduledAt);

    if (!window.open) {
      throw new BadRequestException(
        window.reason === 'not_scheduled'
          ? 'ვიზიტის საათი ჯერ არ არის დანიშნული'
          : window.reason === 'too_early'
            ? `ჩართვა ${JOIN_OPENS_MINUTES} წუთით ადრე გაიხსნება — `
              + `${formatTbilisi(visit.scheduledAt!)}-ზეა დანიშნული`
            : `სამწუხაროდ, თქვენ დააგვიანეთ ვიზიტზე ${LATE_AFTER_MINUTES} წუთზე მეტით. `
              + 'გთხოვთ, ხელახლა ჩაეწეროთ — შემდეგ ჯავშანზე ღირებულების '
              + `მხოლოდ ${100 - LATE_COVER_PERCENT}%-ს გადაიხდით.`,
      );
    }

    return this.join(visit.id, `${visit.parent.firstName} ${visit.parent.lastName}`, 'parent');
  }

  /**
   * მშობლის მხრიდან გაუქმება.
   *
   * წინასწარ გაუქმებისას ჯავშანი სრულად რჩება: ეს ზუსტად ის ქცევაა,
   * რაც გვინდა — ექიმი დროულად იგებს და ადგილი თავისუფლდება. თუ
   * ვიზიტამდე ნაკლებია, ვიდრე ჩართვის ფანჯარა, გაუქმება იკეტება:
   * ამ დროს ექიმი უკვე ელოდება.
   */
  async cancelByParent(id: string, parentId: string) {
    const visit = await this.prisma.videoVisit.findFirst({
      where: { id, parentId, deletedAt: null },
      select: { id: true, status: true, scheduledAt: true },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');

    if (visit.status === VideoVisitStatus.CANCELED) {
      throw new BadRequestException('ვიზიტი უკვე გაუქმებულია');
    }
    if (visit.status === VideoVisitStatus.DONE || visit.status === VideoVisitStatus.LIVE) {
      throw new BadRequestException('მიმდინარე ან შემდგარი ვიზიტი აღარ უქმდება');
    }

    if (
      visit.scheduledAt &&
      Date.now() > visit.scheduledAt.getTime() - JOIN_OPENS_MINUTES * 60 * 1000
    ) {
      throw new BadRequestException(
        `ვიზიტამდე ${JOIN_OPENS_MINUTES} წუთზე ნაკლებია — გაუქმება აღარ შეიძლება`,
      );
    }

    const updated = await this.prisma.videoVisit.update({
      where: { id },
      data: {
        status: VideoVisitStatus.CANCELED,
        endedAt: new Date(),
        staffNote: 'მშობელმა გააუქმა',
      },
    });

    await this.returnEntitlement(id, parentId);
    await this.notifyStaffCanceled(id, visit.scheduledAt).catch(() => undefined);

    return updated;
  }

  private async notifyStaffCanceled(visitId: string, when: Date | null): Promise<void> {
    const staff = await this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }, deletedAt: null },
      select: { id: true },
    });

    await Promise.all(
      staff.map((user) =>
        this.notifications
          .push({
            userId: user.id,
            title: 'ვიზიტი გაუქმდა',
            body: `მშობელმა გააუქმა${when ? ` — ${formatTbilisi(when)}` : ''}. ადგილი გათავისუფლდა.`,
            data: { videoVisitId: visitId },
          })
          .catch(() => undefined),
      ),
    );
  }

  /**
   * შეხსენება ვიზიტამდე.
   *
   * დანიშვნის SMS შეიძლება რამდენიმე დღით ადრე მივიდეს და დაგვიწყდეს.
   * დაგვიანების ჯარიმა გვაქვს — შეხსენება იაფი გზაა, რომ ის საერთოდ
   * არ ამოქმედდეს.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendReminders(): Promise<void> {
    const now = Date.now();
    const from = new Date(now + REMINDER_BEFORE_MINUTES * 60 * 1000 - 5 * 60 * 1000);
    const to = new Date(now + REMINDER_BEFORE_MINUTES * 60 * 1000 + 5 * 60 * 1000);

    const soon = await this.prisma.videoVisit.findMany({
      where: {
        deletedAt: null,
        status: VideoVisitStatus.SCHEDULED,
        reminderSentAt: null,
        scheduledAt: { gte: from, lte: to },
      },
      select: { id: true, parentId: true, scheduledAt: true },
      take: 50,
    });

    for (const visit of soon) {
      // ნიშანს ჯერ ვსვამთ: გაგზავნის ჩავარდნა ორმაგ SMS-ს არ უნდა იწვევდეს
      await this.prisma.videoVisit.update({
        where: { id: visit.id },
        data: { reminderSentAt: new Date() },
      });

      await this.tellReminder(visit.parentId, visit.scheduledAt!).catch(() => undefined);
    }
  }

  private async tellReminder(parentId: string, when: Date): Promise<void> {
    const readable = formatTbilisi(when);

    await this.notifications
      .push({
        userId: parentId,
        title: 'ვიზიტი მალე იწყება',
        body: `${readable} — ჩართვა ${JOIN_OPENS_MINUTES} წუთით ადრე გაიხსნება.`,
      })
      .catch(() => undefined);

    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { phone: true },
    });
    if (!parent?.phone) return;

    await this.sms
      .send({
        userId: parentId,
        phone: parent.phone,
        templateKey: 'video_visit_reminder',
        body:
          `AskDrTeo: შეგახსენებთ — თქვენი ონლაინ ვიზიტი ${readable}-ზეა. `
          + `ჩართვა ${JOIN_OPENS_MINUTES} წუთით ადრე გაიხსნება. `
          + `${LATE_AFTER_MINUTES} წუთზე მეტი დაგვიანებისას ვიზიტი ვერ შედგება.`,
      })
      .catch(() => undefined);
  }

  // ─── პერსონალი ───────────────────────────────────────────────────

  /**
   * დღის რიგი — ვინ არის ჩაწერილი და რა აწუხებთ.
   *
   * ექიმი სწორედ ამ სიას უყურებს ვიზიტების დროს: ხსნის პირველის
   * პროფილს, კითხულობს მიზეზს და ერთვება.
   */
  async queue(dateInput?: string) {
    const day = tbilisiStartOfDay(dateInput ? new Date(dateInput) : new Date());

    const visits = await this.prisma.videoVisit.findMany({
      where: {
        deletedAt: null,
        requestedDate: day,
        status: { in: [...LIVE_STATUSES, VideoVisitStatus.DONE, VideoVisitStatus.NO_SHOW] },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      include: {
        parent: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        child: {
          select: { id: true, firstName: true, lastName: true, birthDate: true, gender: true },
        },
      },
    });

    return {
      date: tbilisiDayKey(day),
      capacity: DAILY_CAPACITY,
      visits: visits.map((visit) => ({
        id: visit.id,
        status: visit.status,
        scheduledAt: visit.scheduledAt,
        reason: visit.reason,
        staffNote: visit.staffNote,
        parent: visit.parent,
        child: visit.child,
        parentWaiting: fresh(visit.parentSeenAt, new Date()),
        parentJoinedAt: visit.parentJoinedAt,
        staffJoinedAt: visit.staffJoinedAt,
      })),
    };
  }

  /** ზუსტი საათის დანიშვნა — შემდეგ მშობელს SMS მიდის. */
  async schedule(id: string, dto: ScheduleVideoVisitDto) {
    const visit = await this.prisma.videoVisit.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, parentId: true, requestedDate: true, status: true },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');
    if (visit.status === VideoVisitStatus.CANCELED) {
      throw new BadRequestException('გაუქმებულ ვიზიტს დრო აღარ ენიშნება');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException('ვიზიტის დრო წარსულშია');
    }

    // საათი იმ დღეს უნდა იყოს, რომელიც მშობელმა აირჩია
    if (tbilisiDayKey(scheduledAt) !== tbilisiDayKey(visit.requestedDate)) {
      throw new BadRequestException('დრო მშობლის არჩეულ დღეს უნდა ემთხვეოდეს');
    }

    const updated = await this.prisma.videoVisit.update({
      where: { id },
      data: {
        scheduledAt,
        status: VideoVisitStatus.SCHEDULED,
        staffNote: dto.staffNote?.trim() || undefined,
      },
    });

    await this.tellParent(visit.parentId, scheduledAt);

    return updated;
  }

  /** ექიმის მხრიდან ჩართვა — მხოლოდ Super Admin. */
  async joinAsStaff(id: string, staffId: string, role: UserRole) {
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('ვიდეო ვიზიტს მხოლოდ ექიმი ატარებს');
    }

    const visit = await this.prisma.videoVisit.findFirst({
      where: { id, deletedAt: null },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');

    const staff = await this.prisma.user.findUniqueOrThrow({
      where: { id: staffId },
      select: { firstName: true, lastName: true },
    });

    await this.prisma.videoVisit.update({
      where: { id },
      data: { staffId },
    });

    // მშობელი გაიგებს, რომ ექიმი უკვე ოთახშია
    await this.notifications
      .push({
        userId: visit.parentId,
        title: 'ექიმი ელოდება',
        body: 'ვიდეო ვიზიტი დაიწყო — შედით შეხვედრაში.',
        data: { videoVisitId: visit.id },
      })
      .catch(() => undefined);

    return this.join(visit.id, `${staff.firstName} ${staff.lastName}`, 'staff');
  }

  /**
   * ვიზიტის გაუქმება ექიმის მხრიდან.
   *
   * მშობელს ჯავშანი უკან უბრუნდება: ვიზიტი მან უკვე გადაიხადა ან
   * უფასო უფლება დახარჯა, გაუქმება კი ჩვენი მხრიდან მოვიდა —
   * ხელახლა ჯავშნა დამატებით არ უნდა დაუჯდეს.
   */
  async cancel(id: string, dto: CancelVideoVisitDto, role: UserRole) {
    if (role === UserRole.PARENT) throw new ForbiddenException('ეს პერსონალის უფლებაა');

    const visit = await this.prisma.videoVisit.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, parentId: true, status: true, scheduledAt: true },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');

    if (visit.status === VideoVisitStatus.CANCELED) {
      throw new BadRequestException('ვიზიტი უკვე გაუქმებულია');
    }
    if (visit.status === VideoVisitStatus.DONE) {
      throw new BadRequestException('შემდგარი ვიზიტი აღარ უქმდება');
    }

    const reason = dto.reason?.trim() || null;

    const updated = await this.prisma.videoVisit.update({
      where: { id },
      data: {
        status: VideoVisitStatus.CANCELED,
        staffNote: reason ?? undefined,
        endedAt: new Date(),
      },
    });

    await this.returnEntitlement(id, visit.parentId);
    await this.tellCanceled(visit.parentId, visit.scheduledAt, reason);

    return updated;
  }

  /**
   * ჯავშნის უფლების დაბრუნება.
   *
   * თუ უფასო უფლებით იყო აღებული, იგივე უფლება თავისუფლდება; თუ
   * გადახდილი იყო, ახალი უფლება ეძლევა — თანხა ისე ვერ დაიკარგება,
   * რომ ვიზიტი ჩვენ გავაუქმეთ.
   */
  private async returnEntitlement(visitId: string, parentId: string): Promise<void> {
    const used = await this.prisma.videoVisitCredit.findFirst({ where: { visitId } });

    if (used) {
      await this.prisma.videoVisitCredit.update({
        where: { id: used.id },
        data: { usedAt: null, visitId: null },
      });
      return;
    }

    const paid = await this.prisma.videoVisit.findUnique({
      where: { id: visitId },
      select: { paymentId: true },
    });
    if (!paid?.paymentId) return;

    await this.grantCredit(parentId, 'grant', 'გაუქმებული ვიზიტის ანაცვლება');
  }

  private async tellCanceled(
    parentId: string,
    when: Date | null,
    reason: string | null,
  ): Promise<void> {
    const readable = when ? formatTbilisi(when) : null;

    await this.notifications
      .push({
        userId: parentId,
        title: 'ვიზიტი გაუქმდა',
        body:
          `სამწუხაროდ, ${readable ? `${readable}-ზე დანიშნული ` : ''}ვიზიტი გაუქმდა.`
          + (reason ? ` ${reason}` : '')
          + ' ჯავშანი დაგიბრუნდათ — აირჩიეთ სხვა დღე.',
      })
      .catch(() => undefined);

    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { phone: true },
    });
    if (!parent?.phone) return;

    await this.sms
      .send({
        userId: parentId,
        phone: parent.phone,
        templateKey: 'video_visit_canceled',
        body:
          `AskDrTeo: სამწუხაროდ, თქვენი ონლაინ ვიზიტი`
          + (readable ? ` (${readable})` : '')
          + ` გაუქმდა.`
          + (reason ? ` ${reason}` : '')
          + ` ჯავშანი დაგიბრუნდათ — აირჩიეთ სხვა დღე.`,
      })
      .catch(() => undefined);
  }

  /**
   * გაცდენილი ვიზიტების დახურვა.
   *
   * ექიმის დრო დაჯავშნილი იყო და უშედეგოდ გავიდა — ვიზიტი იკეტება,
   * მშობელს კი შემდეგ ჯავშანზე ფასდაკლება რჩება: თანხის სრული
   * დაკარგვა უსამართლოა, სრული დაბრუნება კი ექიმის დროს არაფრად
   * აქცევდა.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async markMissed(): Promise<void> {
    const cutoff = new Date(Date.now() - LATE_AFTER_MINUTES * 60 * 1000);

    const missed = await this.prisma.videoVisit.findMany({
      where: {
        deletedAt: null,
        status: VideoVisitStatus.SCHEDULED,
        scheduledAt: { lt: cutoff },
        parentJoinedAt: null,
      },
      select: { id: true, parentId: true, scheduledAt: true },
      take: 50,
    });

    for (const visit of missed) {
      await this.prisma.videoVisit.update({
        where: { id: visit.id },
        data: { status: VideoVisitStatus.NO_SHOW, endedAt: new Date() },
      });

      await this.grantCredit(
        visit.parentId,
        'late',
        'დაგვიანებული ვიზიტის ფასდაკლება',
        undefined,
        LATE_COVER_PERCENT,
      );

      await this.tellMissed(visit.parentId, visit.scheduledAt).catch(() => undefined);
      this.logger.warn(`ვიზიტი ${visit.id} გაცდენილად აღინიშნა`);
    }

    await this.sweepDoctorNoShow(cutoff);
  }

  /**
   * ექიმის მხრიდან გაცდენა.
   *
   * მშობელი ოთახში შევიდა და ელოდა, ექიმი კი არ გამოჩნდა — აქ ჯარიმა
   * უადგილოა: ვიზიტი სრულად უბრუნდება. ამის გარეშე შეცდომის ფასს
   * მთლიანად მშობელი იხდიდა და ეს ცალმხრივი იქნებოდა.
   */
  private async sweepDoctorNoShow(cutoff: Date): Promise<void> {
    const missed = await this.prisma.videoVisit.findMany({
      where: {
        deletedAt: null,
        status: VideoVisitStatus.SCHEDULED,
        scheduledAt: { lt: cutoff },
        parentJoinedAt: { not: null },
        staffJoinedAt: null,
      },
      select: { id: true, parentId: true, scheduledAt: true },
      take: 50,
    });

    for (const visit of missed) {
      await this.prisma.videoVisit.update({
        where: { id: visit.id },
        data: {
          status: VideoVisitStatus.CANCELED,
          endedAt: new Date(),
          staffNote: 'ექიმი ვერ დაესწრო — ჯავშანი სრულად დაბრუნდა',
        },
      });

      await this.returnEntitlement(visit.id, visit.parentId);
      await this.tellDoctorMissed(visit.parentId, visit.scheduledAt).catch(() => undefined);

      this.logger.error(`ვიზიტს ${visit.id} ექიმი არ დაესწრო`);
    }
  }

  private async tellDoctorMissed(parentId: string, when: Date | null): Promise<void> {
    const readable = when ? formatTbilisi(when) : null;

    await this.notifications
      .push({
        userId: parentId,
        title: 'ბოდიშს გიხდით — ვიზიტი ვერ შედგა',
        body:
          `${readable ? `${readable}-ზე დანიშნულ ` : ''}ვიზიტს ექიმი ვერ დაესწრო. `
          + 'ჯავშანი სრულად დაგიბრუნდათ — აირჩიეთ სხვა დღე.',
      })
      .catch(() => undefined);

    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { phone: true },
    });
    if (!parent?.phone) return;

    await this.sms
      .send({
        userId: parentId,
        phone: parent.phone,
        templateKey: 'video_visit_doctor_missed',
        body:
          `AskDrTeo: ბოდიშს გიხდით — ${readable ? `${readable}-ის ` : ''}ვიზიტს `
          + 'ექიმი ვერ დაესწრო. ჯავშანი სრულად დაგიბრუნდათ, ხელახლა ჩაწერა '
          + 'დამატებით არ დაგიჯდებათ.',
      })
      .catch(() => undefined);
  }

  private async tellMissed(parentId: string, when: Date | null): Promise<void> {
    const readable = when ? formatTbilisi(when) : null;
    const share = 100 - LATE_COVER_PERCENT;
    const price = `$${(Math.round((VISIT_PRICE_MINOR * share) / 100) / 100).toFixed(2)}`;

    await this.notifications
      .push({
        userId: parentId,
        title: 'ვიზიტი ვერ შედგა',
        body:
          `სამწუხაროდ, ${readable ? `${readable}-ზე დანიშნულ ` : ''}ვიზიტზე დააგვიანეთ. `
          + `გთხოვთ, ხელახლა ჩაეწეროთ — შემდეგ ჯავშანზე ღირებულების მხოლოდ `
          + `${share}%-ს (${price}) გადაიხდით.`,
      })
      .catch(() => undefined);

    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { phone: true },
    });
    if (!parent?.phone) return;

    await this.sms
      .send({
        userId: parentId,
        phone: parent.phone,
        templateKey: 'video_visit_missed',
        body:
          `AskDrTeo: სამწუხაროდ, ${readable ? `${readable}-ის ` : ''}ვიზიტი ვერ შედგა — `
          + `დაგვიანება თქვენი მიზეზით მოხდა და ექიმის დრო დაიხარჯა. `
          + `ამის გამო შემდეგი ვიზიტის დასაჯავშნად იხდით ღირებულების `
          + `${share}%-ს — ${price}.`,
      })
      .catch(() => undefined);
  }

  async finish(id: string, role: UserRole) {
    if (role === UserRole.PARENT) throw new ForbiddenException('ეს პერსონალის უფლებაა');

    return this.prisma.videoVisit.update({
      where: { id },
      data: { status: VideoVisitStatus.DONE, endedAt: new Date() },
    });
  }

  // ─── შიდა ────────────────────────────────────────────────────────

  /**
   * ოთახში შესვლა.
   *
   * ორივე მხარეს ერთი და იგივე ოთახი ხვდება; სტატუსი LIVE მაშინ ხდება,
   * როცა ორივემ დააჭირა — სწორედ ეს არის „კავშირი დამყარდა".
   */
  private async join(id: string, displayName: string, side: 'parent' | 'staff') {
    const now = new Date();

    const visit = await this.prisma.videoVisit.update({
      where: { id },
      data:
        side === 'parent'
          ? { parentJoinedAt: now, parentSeenAt: now }
          : { staffJoinedAt: now, staffSeenAt: now },
    });

    const bothIn = !!visit.parentJoinedAt && !!visit.staffJoinedAt;

    if (bothIn && visit.status !== VideoVisitStatus.LIVE) {
      await this.prisma.videoVisit.update({
        where: { id },
        data: { status: VideoVisitStatus.LIVE, startedAt: visit.startedAt ?? now },
      });
    }

    const conversationId = await this.ensureConversation(visit.id);

    // ინტერფეისი ჩვენია — კლიენტს არხი და ტოკენი გადაეცემა, არა ბმული
    const access = this.agora.issue(visit.roomName, side);

    return {
      id: visit.id,
      appId: access.appId,
      channel: access.channel,
      token: access.token,
      uid: access.uid,
      tokenExpiresAt: access.expiresAt,
      displayName,
      conversationId,
      /** მეორე მხარე უკვე ოთახშია თუ არა */
      otherSideReady: side === 'parent' ? !!visit.staffJoinedAt : !!visit.parentJoinedAt,
      status: bothIn ? VideoVisitStatus.LIVE : visit.status,
    };
  }

  /**
   * ვიდეოს პარალელური ჩატი — ჩვეულებრივი საუბარი, დანართებით.
   *
   * მონაწილეებს ყოველ ჩართვაზე ვასწორებთ: ოთახს ხშირად ჯერ მშობელი
   * ხსნის, ექიმი კი მოგვიანებით ერთვება — მაშინ ის ჩატში უნდა
   * დაემატოს, თორემ საკუთარ ვიზიტში წერას ვერ შეძლებდა.
   */
  async ensureConversation(visitId: string): Promise<string> {
    const visit = await this.prisma.videoVisit.findUniqueOrThrow({
      where: { id: visitId },
      select: { parentId: true, staffId: true, conversationId: true },
    });

    let conversationId = visit.conversationId;

    if (!conversationId) {
      const conversation = await this.prisma.conversation.create({
        // სახეობა კრიტიკულია: ასე ეს საუბარი ოპერატორის რიგში,
        // მშობლის ჩატებსა და წაუკითხავებში აღარ ჩნდება
        data: { subject: 'ვიდეო ვიზიტი', kind: ConversationKind.VIDEO_VISIT },
      });
      conversationId = conversation.id;

      await this.prisma.videoVisit.update({
        where: { id: visitId },
        data: { conversationId },
      });
    }

    const members = [visit.parentId, visit.staffId].filter(
      (id): id is string => typeof id === 'string',
    );

    await Promise.all(
      members.map((userId) =>
        this.prisma.conversationUser.upsert({
          where: { conversationId_userId: { conversationId: conversationId!, userId } },
          create: { conversationId: conversationId!, userId },
          update: {},
        }),
      ),
    );

    return conversationId;
  }

  /**
   * ვინ არის ოთახში ახლა.
   *
   * გამომძახებელი თავის ნიშანს ტოვებს და მეორე მხარის მდგომარეობას
   * იღებს — ასე ორივე ხედავს, პარტნიორი შემოვიდა თუ არა.
   */
  async presence(visitId: string, userId: string, role: UserRole) {
    const visit = await this.prisma.videoVisit.findFirst({
      where: { id: visitId, deletedAt: null },
      select: {
        parentId: true,
        status: true,
        parentSeenAt: true,
        staffSeenAt: true,
        staff: { select: { firstName: true, lastName: true } },
        parent: { select: { firstName: true } },
      },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');

    const isParent = role === UserRole.PARENT;
    if (isParent && visit.parentId !== userId) {
      throw new ForbiddenException('ეს ვიზიტი თქვენი არ არის');
    }

    const now = new Date();

    const updated = await this.prisma.videoVisit.update({
      where: { id: visitId },
      data: isParent ? { parentSeenAt: now } : { staffSeenAt: now },
      select: { parentSeenAt: true, staffSeenAt: true, status: true },
    });

    return {
      parentPresent: fresh(updated.parentSeenAt, now),
      staffPresent: fresh(updated.staffSeenAt, now),
      parentName: visit.parent.firstName,
      staffName: visit.staff ? `${visit.staff.firstName} ${visit.staff.lastName}` : null,
      status: updated.status,
    };
  }

  /**
   * ტოკენის განახლება მიმდინარე ზარისთვის.
   *
   * `join`-ისგან იმით განსხვავდება, რომ მდგომარეობას არ ცვლის —
   * ჩართვის დროს ხელახლა არ ითვლება და სტატუსი არ იძვრება.
   */
  async renewToken(visitId: string, userId: string, role: UserRole) {
    const visit = await this.prisma.videoVisit.findFirst({
      where: { id: visitId, deletedAt: null },
      select: { parentId: true, roomName: true },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');

    const isParent = role === UserRole.PARENT;
    if (isParent && visit.parentId !== userId) {
      throw new ForbiddenException('ეს ვიზიტი თქვენი არ არის');
    }

    const access = this.agora.issue(visit.roomName, isParent ? 'parent' : 'staff');

    return { token: access.token, uid: access.uid, expiresAt: access.expiresAt };
  }

  /** ვიზიტის ჩატი — მონაწილეობის შემოწმებით. */
  async conversationFor(visitId: string, userId: string, role: UserRole): Promise<string> {
    const visit = await this.prisma.videoVisit.findFirst({
      where: { id: visitId, deletedAt: null },
      select: { parentId: true },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');

    if (role === UserRole.PARENT && visit.parentId !== userId) {
      throw new ForbiddenException('ეს ვიზიტი თქვენი არ არის');
    }

    return this.ensureConversation(visitId);
  }

  private parentView(visit: {
    id: string;
    requestedDate: Date;
    scheduledAt: Date | null;
    status: VideoVisitStatus;
    reason: string | null;
    staffNote: string | null;
    child: { id: string; firstName: string } | null;
  }) {
    return {
      id: visit.id,
      date: tbilisiDayKey(visit.requestedDate),
      scheduledAt: visit.scheduledAt,
      status: visit.status,
      reason: visit.reason,
      staffNote: visit.staffNote,
      child: visit.child,
      canJoin: joinWindow(visit.status, visit.scheduledAt).open,
      /** როდის გაიხსნება ღილაკი — მშობელს ლოდინის მიზეზი უნდა ესმოდეს */
      opensAt: visit.scheduledAt
        ? new Date(visit.scheduledAt.getTime() - JOIN_OPENS_MINUTES * 60 * 1000)
        : null,
    };
  }

  private async notifyStaff(visitId: string, day: Date): Promise<void> {
    const staff = await this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }, deletedAt: null },
      select: { id: true },
    });

    await Promise.all(
      staff.map((user) =>
        this.notifications
          .push({
            userId: user.id,
            title: 'ახალი ვიდეო ჯავშანი',
            body: `${tbilisiDayKey(day)} — საათი დასანიშნია`,
            data: { videoVisitId: visitId },
          })
          .catch(() => undefined),
      ),
    );
  }

  private async tellParent(parentId: string, when: Date): Promise<void> {
    const readable = formatTbilisi(when);

    await this.notifications
      .push({
        userId: parentId,
        title: 'ვიდეო ვიზიტი დაინიშნა',
        body: `${readable}. გთხოვთ, იყოთ მზად ${BE_READY_MINUTES} წუთით ადრე.`,
      })
      .catch(() => undefined);

    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { phone: true },
    });
    if (!parent?.phone) return;

    await this.sms
      .send({
        userId: parentId,
        phone: parent.phone,
        templateKey: 'video_visit_scheduled',
        body:
          `AskDrTeo: თქვენი ონლაინ ვიზიტი დაინიშნა ${readable}. `
          + `გთხოვთ, ჩართვისთვის მზად იყოთ ${BE_READY_MINUTES} წუთით ადრე.`,
      })
      .catch(() => undefined);
  }
}

/** ნიშანი ჯერ ცოცხალია თუ დაძველდა. */
function fresh(seenAt: Date | null, now: Date): boolean {
  return !!seenAt && now.getTime() - seenAt.getTime() < PRESENCE_TTL_MS;
}

/**
 * ჩართვის ფანჯარა.
 *
 * იხსნება დანიშნულ საათამდე 10 წუთით ადრე და ორი საათის შემდეგ
 * იკეტება — გვიან შემოსული მშობელიც უნდა მოხვდეს, უვადოდ ღია ოთახი
 * კი ექიმს ნებისმიერ დროს გამოიძახებდა.
 */
function joinWindow(
  status: VideoVisitStatus,
  scheduledAt: Date | null,
): { open: boolean; reason?: 'not_scheduled' | 'too_early' | 'too_late' } {
  if (!scheduledAt || (status !== VideoVisitStatus.SCHEDULED && status !== VideoVisitStatus.LIVE)) {
    return { open: false, reason: 'not_scheduled' };
  }

  const now = Date.now();
  const opens = scheduledAt.getTime() - JOIN_OPENS_MINUTES * 60 * 1000;
  const closes = scheduledAt.getTime() + JOIN_CLOSES_MINUTES * 60 * 1000;

  if (now < opens) return { open: false, reason: 'too_early' };
  if (now > closes) return { open: false, reason: 'too_late' };

  return { open: true };
}
