import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, VideoVisitStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';
import {
  BE_READY_MINUTES,
  BOOKING_HORIZON_DAYS,
  DAILY_CAPACITY,
  roomUrl,
} from './video-visits.config';
import { ScheduleVideoVisitDto } from './dto/video-visit.dto';

/** დღეები, რომლებზეც ჯავშანი შეიძლება ჯერ კიდევ შედგეს. */
const LIVE_STATUSES: VideoVisitStatus[] = [
  VideoVisitStatus.REQUESTED,
  VideoVisitStatus.SCHEDULED,
  VideoVisitStatus.LIVE,
];

@Injectable()
export class VideoVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly sms: SmsService,
  ) {}

  // ─── მშობელი ─────────────────────────────────────────────────────

  /**
   * უახლოესი დღეების ტევადობა.
   *
   * მშობელს კალენდარში მაშინვე უნდა უჩანდეს, რომელი დღე ივსება —
   * თორემ გადახდის შემდეგ „ადგილი აღარ არის" ყველაზე ცუდი პასუხია.
   */
  async availability() {
    const from = startOfDay(new Date());
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

    const taken = new Map(rows.map((row) => [dayKey(row.requestedDate), row._count._all]));

    return Array.from({ length: BOOKING_HORIZON_DAYS }, (_, index) => {
      const date = addDays(from, index);
      const used = taken.get(dayKey(date)) ?? 0;

      return {
        date: dayKey(date),
        capacity: DAILY_CAPACITY,
        used,
        free: Math.max(0, DAILY_CAPACITY - used),
      };
    });
  }

  /** დღეზე ადგილის შემოწმება — გადახდის დაწყებამდეც და ჩარიცხვამდეც. */
  async assertDayFree(date: Date): Promise<void> {
    const day = startOfDay(date);

    if (day.getTime() < startOfDay(new Date()).getTime()) {
      throw new BadRequestException('არჩეული დღე უკვე გასულია');
    }
    if (day.getTime() > addDays(startOfDay(new Date()), BOOKING_HORIZON_DAYS).getTime()) {
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

  /** გადახდის დადასტურების შემდეგ — ჯავშნის შექმნა. */
  async grant(input: {
    parentId: string;
    date: Date;
    childId?: string | null;
    reason?: string | null;
    paymentId?: string;
  }) {
    const day = startOfDay(input.date);
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
        body: `${dayKey(day)} — ექიმი ზუსტ საათს დანიშნავს და შეგატყობინებთ.`,
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

  /** მშობლის მხრიდან ჩართვა. */
  async joinAsParent(id: string, parentId: string) {
    const visit = await this.prisma.videoVisit.findFirst({
      where: { id, parentId, deletedAt: null },
      include: { parent: { select: { firstName: true, lastName: true } } },
    });
    if (!visit) throw new NotFoundException('ვიზიტი ვერ მოიძებნა');

    return this.join(visit.id, `${visit.parent.firstName} ${visit.parent.lastName}`, 'parent');
  }

  // ─── პერსონალი ───────────────────────────────────────────────────

  /**
   * დღის რიგი — ვინ არის ჩაწერილი და რა აწუხებთ.
   *
   * ექიმი სწორედ ამ სიას უყურებს ვიზიტების დროს: ხსნის პირველის
   * პროფილს, კითხულობს მიზეზს და ერთვება.
   */
  async queue(dateInput?: string) {
    const day = startOfDay(dateInput ? new Date(dateInput) : new Date());

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
      date: dayKey(day),
      capacity: DAILY_CAPACITY,
      visits: visits.map((visit) => ({
        id: visit.id,
        status: visit.status,
        scheduledAt: visit.scheduledAt,
        reason: visit.reason,
        staffNote: visit.staffNote,
        parent: visit.parent,
        child: visit.child,
        parentWaiting: !!visit.parentJoinedAt && !visit.endedAt,
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
    if (dayKey(scheduledAt) !== dayKey(visit.requestedDate)) {
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
      data: side === 'parent' ? { parentJoinedAt: now } : { staffJoinedAt: now },
    });

    const bothIn = !!visit.parentJoinedAt && !!visit.staffJoinedAt;

    if (bothIn && visit.status !== VideoVisitStatus.LIVE) {
      await this.prisma.videoVisit.update({
        where: { id },
        data: { status: VideoVisitStatus.LIVE, startedAt: visit.startedAt ?? now },
      });
    }

    const conversationId = await this.ensureConversation(visit.id);

    return {
      id: visit.id,
      roomUrl: roomUrl(visit.roomName, displayName),
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
        data: { subject: 'ვიდეო ვიზიტი' },
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
    const canJoin =
      (visit.status === VideoVisitStatus.SCHEDULED || visit.status === VideoVisitStatus.LIVE) &&
      !!visit.scheduledAt &&
      // ჩართვა ნახევარი საათით ადრე იხსნება და ორ საათს რჩება ღია
      Date.now() > visit.scheduledAt.getTime() - 30 * 60 * 1000 &&
      Date.now() < visit.scheduledAt.getTime() + 2 * 60 * 60 * 1000;

    return {
      id: visit.id,
      date: dayKey(visit.requestedDate),
      scheduledAt: visit.scheduledAt,
      status: visit.status,
      reason: visit.reason,
      staffNote: visit.staffNote,
      child: visit.child,
      canJoin,
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
            body: `${dayKey(day)} — საათი დასანიშნია`,
            data: { videoVisitId: visitId },
          })
          .catch(() => undefined),
      ),
    );
  }

  private async tellParent(parentId: string, when: Date): Promise<void> {
    const readable = formatVisitTime(when);

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

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** „2026-08-25" — დღის იდენტიფიკატორი დროის ზონის გარეშე. */
function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatVisitTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
