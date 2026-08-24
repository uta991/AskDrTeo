import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { formatTbilisi } from '@/common/utils/tbilisi-time';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { SmsService } from '../sms/sms.service';
import { CreateAppointmentDto, DecideAppointmentDto } from './dto/appointment.dto';

const FREE_VISIT_FEATURE = 'monthly_free_visit';

/** რამდენი წუთით ადრე ვთხოვთ მშობელს მზადყოფნას. */
const BE_READY_MINUTES = 10;

/** გაუქმებული ჯავშანი კვოტას არ ხარჯავს — მხოლოდ ესენი ითვლება. */
const COUNTS_TOWARD_QUOTA: AppointmentStatus[] = [
  AppointmentStatus.REQUESTED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.DONE,
];

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly sms: SmsService,
  ) {}

  /**
   * თვის უფასო ვიზიტების მდგომარეობა.
   *
   * კვოტა კალენდარულ თვეზეა და არა 30 დღეზე: მშობელს „ამ თვეში
   * გამოვიყენე" უფრო ესმის, ვიდრე მოძრავი ფანჯარა.
   */
  async quota(userId: string) {
    const limit = (await this.entitlements.limit(userId, FREE_VISIT_FEATURE)) ?? 0;
    const used = await this.prisma.appointment.count({
      where: {
        parentId: userId,
        usedFreeVisit: true,
        deletedAt: null,
        status: { in: COUNTS_TOWARD_QUOTA },
        createdAt: { gte: startOfMonth() },
      },
    });

    return { limit, used, remaining: Math.max(0, limit - used) };
  }

  async listForParent(userId: string) {
    return this.prisma.appointment.findMany({
      where: { parentId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        preferredAt: true,
        scheduledAt: true,
        status: true,
        reason: true,
        staffNote: true,
        usedFreeVisit: true,
        child: { select: { id: true, firstName: true } },
      },
    });
  }

  /**
   * ვიზიტის მოთხოვნა.
   *
   * მშობელი დროს არ ირჩევს — მხოლოდ ითხოვს. კონკრეტულ საათს ექიმი
   * ნიშნავს, რადგან მისი კალენდარი მშობელს არ უჩანს და არჩეული დრო
   * ისედაც თითქმის ყოველთვის იცვლებოდა.
   */
  async create(dto: CreateAppointmentDto, userId: string) {
    if (dto.childId) {
      const child = await this.prisma.child.findFirst({
        where: { id: dto.childId, deletedAt: null },
        select: { parentId: true },
      });
      if (!child) throw new NotFoundException('ბავშვის პროფილი ვერ მოიძებნა');
      if (child.parentId !== userId) throw new ForbiddenException('ეს პროფილი თქვენი არ არის');
    }

    // ერთდროულად ერთი განუხილველი მოთხოვნა — რიგი თორემ დუბლიკატებით ივსება
    const pending = await this.prisma.appointment.count({
      where: { parentId: userId, status: AppointmentStatus.REQUESTED, deletedAt: null },
    });
    if (pending > 0) {
      throw new BadRequestException('თქვენი წინა მოთხოვნა ჯერ განხილვაშია');
    }

    const quota = await this.quota(userId);

    const appointment = await this.prisma.appointment.create({
      data: {
        parentId: userId,
        childId: dto.childId,
        reason: dto.reason?.trim() || null,
        usedFreeVisit: quota.remaining > 0,
      },
    });

    await this.notifyStaff(appointment.id, appointment.usedFreeVisit);

    return appointment;
  }

  async cancel(id: string, userId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, parentId: true, status: true },
    });
    if (!appointment) throw new NotFoundException('ჯავშანი ვერ მოიძებნა');
    if (appointment.parentId !== userId) throw new ForbiddenException('ეს ჯავშანი თქვენი არ არის');
    if (appointment.status === AppointmentStatus.DONE) {
      throw new BadRequestException('შემდგარი ვიზიტი აღარ უქმდება');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELED },
    });
  }

  // ── პერსონალის მხარე ─────────────────────────────────────────────

  async listAll(status?: AppointmentStatus) {
    return this.prisma.appointment.findMany({
      where: { deletedAt: null, status: status ?? undefined },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 100,
      select: {
        id: true,
        preferredAt: true,
        scheduledAt: true,
        status: true,
        reason: true,
        staffNote: true,
        usedFreeVisit: true,
        createdAt: true,
        parent: { select: { id: true, firstName: true, lastName: true, phone: true } },
        child: { select: { id: true, firstName: true, birthDate: true } },
      },
    });
  }

  async decide(
    id: string,
    status: AppointmentStatus,
    dto: DecideAppointmentDto,
    actorRole: UserRole,
  ) {
    if (actorRole === UserRole.PARENT) throw new ForbiddenException('ეს პერსონალის უფლებაა');

    const appointment = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, parentId: true, scheduledAt: true },
    });
    if (!appointment) throw new NotFoundException('ჯავშანი ვერ მოიძებნა');

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : appointment.scheduledAt;

    // დადასტურება დროის გარეშე მშობელს არაფერს ეუბნება — ის სწორედ
    // საათს ელოდება, ამიტომ აქ დრო სავალდებულოა
    if (status === AppointmentStatus.CONFIRMED) {
      if (!scheduledAt) throw new BadRequestException('მიუთითეთ ვიზიტის დრო');
      if (scheduledAt.getTime() < Date.now()) {
        throw new BadRequestException('ვიზიტის დრო წარსულშია');
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status,
        scheduledAt: scheduledAt ?? undefined,
        staffNote: dto.staffNote?.trim() || undefined,
      },
    });

    await this.notifyParent(appointment.parentId, updated.status, updated.scheduledAt);

    return updated;
  }

  private async notifyStaff(appointmentId: string, free: boolean): Promise<void> {
    const staff = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        deletedAt: null,
      },
      select: { id: true },
    });

    await this.prisma.notification.createMany({
      data: staff.map((user) => ({
        userId: user.id,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title: 'ვიზიტის ახალი მოთხოვნა',
        body: `მშობელი ელოდება დროის დანიშვნას${free ? ' — პაკეტის უფასო ვიზიტი' : ''}`,
        data: { appointmentId } as Prisma.InputJsonValue,
        sentAt: new Date(),
      })),
    });
  }

  /**
   * მშობლის გაფრთხილება გადაწყვეტილებაზე.
   *
   * დანიშნულ დროზე SMS-იც მიდის: შეტყობინება მხოლოდ მაშინ ჩანს, როცა
   * აპლიკაცია გახსნილია, ვიზიტს კი ადამიანი წინასწარ უნდა დაელოდოს.
   */
  private async notifyParent(
    parentId: string,
    status: AppointmentStatus,
    when: Date | null,
  ): Promise<void> {
    const titles: Partial<Record<AppointmentStatus, string>> = {
      CONFIRMED: 'ონლაინ ვიზიტი დაინიშნა',
      DECLINED: 'ვიზიტი ვერ დადასტურდა',
      DONE: 'ვიზიტი შედგა',
      CANCELED: 'ვიზიტი გაუქმდა',
    };

    const title = titles[status];
    if (!title) return;

    const confirmed = status === AppointmentStatus.CONFIRMED && !!when;
    const readable = when ? formatTbilisi(when) : 'დრო ჯერ არ არის დანიშნული';

    const body = confirmed
      ? `${readable}. გთხოვთ, იყოთ მზად ${BE_READY_MINUTES} წუთით ადრე.`
      : readable;

    await this.prisma.notification.create({
      data: {
        userId: parentId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title,
        body,
        sentAt: new Date(),
      },
    });

    if (!confirmed) return;

    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { phone: true },
    });
    if (!parent?.phone) return;

    // SMS-ის ჩავარდნა შეტყობინებას არ უნდა აუქმებდეს
    await this.sms
      .send({
        userId: parentId,
        phone: parent.phone,
        templateKey: 'appointment_confirmed',
        body:
          `AskDrTeo: თქვენ გაქვთ ჩანიშნული ონლაინ ვიზიტი ${readable}. `
          + `გთხოვთ, იყოთ მზად ${BE_READY_MINUTES} წუთით ადრე.`,
      })
      .catch(() => undefined);
  }
}


/** მიმდინარე კალენდარული თვის დასაწყისი. */
function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
