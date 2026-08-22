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
import { EntitlementsService } from '../entitlements/entitlements.service';
import { CreateAppointmentDto, DecideAppointmentDto } from './dto/appointment.dto';

const FREE_VISIT_FEATURE = 'monthly_free_visit';

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
      orderBy: { preferredAt: 'desc' },
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

  async create(dto: CreateAppointmentDto, userId: string) {
    const preferredAt = new Date(dto.preferredAt);
    if (preferredAt.getTime() < Date.now()) {
      throw new BadRequestException('სასურველი დრო წარსულშია');
    }

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
        preferredAt,
        reason: dto.reason?.trim() || null,
        usedFreeVisit: quota.remaining > 0,
      },
    });

    await this.notifyStaff(appointment.id, preferredAt, appointment.usedFreeVisit);

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
      orderBy: [{ status: 'asc' }, { preferredAt: 'asc' }],
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
      select: { id: true, parentId: true, preferredAt: true },
    });
    if (!appointment) throw new NotFoundException('ჯავშანი ვერ მოიძებნა');

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        staffNote: dto.staffNote?.trim() || undefined,
      },
    });

    await this.notifyParent(appointment.parentId, updated.status, updated.scheduledAt ?? updated.preferredAt);

    return updated;
  }

  private async notifyStaff(appointmentId: string, preferredAt: Date, free: boolean): Promise<void> {
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
        body: `${preferredAt.toLocaleString('ka-GE')}${free ? ' — პაკეტის უფასო ვიზიტი' : ''}`,
        data: { appointmentId } as Prisma.InputJsonValue,
        sentAt: new Date(),
      })),
    });
  }

  private async notifyParent(
    parentId: string,
    status: AppointmentStatus,
    when: Date,
  ): Promise<void> {
    const titles: Partial<Record<AppointmentStatus, string>> = {
      CONFIRMED: 'ვიზიტი დადასტურდა',
      DECLINED: 'ვიზიტი ვერ დადასტურდა',
      DONE: 'ვიზიტი შედგა',
      CANCELED: 'ვიზიტი გაუქმდა',
    };

    const title = titles[status];
    if (!title) return;

    await this.prisma.notification.create({
      data: {
        userId: parentId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title,
        body: when.toLocaleString('ka-GE'),
        sentAt: new Date(),
      },
    });
  }
}

/** მიმდინარე კალენდარული თვის დასაწყისი. */
function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
