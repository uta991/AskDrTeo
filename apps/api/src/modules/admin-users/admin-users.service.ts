import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '@/common/prisma/prisma.service';
import { normalizeEmail, normalizePhone } from '@/common/utils/identifier.util';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { TokensService } from '../auth/tokens.service';
import {
  ChangeRoleDto,
  ChangeStatusDto,
  CreateStaffDto,
  GrantSubscriptionDto,
  ListUsersQueryDto,
  SetPasswordDto,
} from './dto/admin-user.dto';

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const ACTIVE_STATUSES = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

/** მიმდინარე გამოწერა — სიაშიც ჩანს, რომ ადმინმა ერთი შეხედვით დაინახოს. */
const ACTIVE_SUBSCRIPTION_SELECT = {
  where: { status: { in: ACTIVE_STATUSES } },
  orderBy: { createdAt: 'desc' },
  take: 1,
  select: {
    id: true,
    status: true,
    currentPeriodEnd: true,
    trialEndsAt: true,
    grantedByUserId: true,
    grantedNote: true,
    plan: { select: { id: true, code: true, name: true, isFree: true } },
  },
} satisfies Prisma.User$subscriptionsArgs;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
    private readonly tokens: TokensService,
  ) {}

  async list(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;

    const roles = query.roles
      ?.split(',')
      .map((role) => role.trim())
      .filter((role): role is UserRole => role in UserRole);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: roles?.length ? { in: roles } : query.role,
      status: query.status,
      // პაკეტით ფილტრი — მხოლოდ აქტიურ გამოწერას ვითვალისწინებთ
      ...(query.planCode
        ? {
            subscriptions: {
              some: { status: { in: ACTIVE_STATUSES }, plan: { code: query.planCode } },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { ...USER_SELECT, subscriptions: ACTIVE_SUBSCRIPTION_SELECT },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.user.count({ where }),
    ]);

    // `subscriptions[0]` → `subscription` — კლიენტს მასივი არ სჭირდება
    const items = rows.map(({ subscriptions, ...user }) => ({
      ...user,
      subscription: subscriptions[0] ?? null,
    }));

    return { items, total, page, perPage, pages: Math.ceil(total / perPage) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...USER_SELECT,
        children: { where: { deletedAt: null }, select: { id: true, firstName: true, birthDate: true } },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { plan: { select: { code: true, name: true } } },
        },
      },
    });

    if (!user) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    return user;
  }

  /**
   * ანგარიშის შექმნა ადმინის მიერ: მშობელი, ოპერატორი, ადმინი, Super Admin.
   *
   * ADMIN-ს SUPER_ADMIN-ის შექმნა არ შეუძლია: ეს პრივილეგიის ესკალაციაა —
   * ადმინი შექმნიდა Super Admin ანგარიშს, შევიდოდა მასში და სისტემაზე
   * სრულ კონტროლს მიიღებდა.
   */
  async createStaff(dto: CreateStaffDto, actorId: string, actorRole: UserRole) {
    if (dto.role === UserRole.SUPER_ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin-ის შექმნა მხოლოდ Super Admin-ს შეუძლია');
    }

    const email = normalizeEmail(dto.email);
    const phone = dto.phone ? normalizePhone(dto.phone) : undefined;

    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])], deletedAt: null },
    });
    if (exists) throw new ConflictException('ასეთი ელ. ფოსტით ან ნომრით ანგარიში უკვე არსებობს');

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        phone,
        passwordHash: await argon2.hash(dto.password),
        role: dto.role,
        // პერსონალს SMS დადასტურება არ სჭირდება — ანგარიშს ადმინი ქმნის
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        acceptedTermsAt: new Date(),
        termsVersion: '1.0',
      },
      select: USER_SELECT,
    });

    // ოპერატორს სამუშაო პროფილიც ეხსნება
    if (dto.role === UserRole.OPERATOR) {
      await this.prisma.operatorProfile.create({ data: { userId: user.id } });
    }

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      after: user,
      description: `შეიქმნა ${dto.role}: ${email}`,
    });

    return user;
  }

  /**
   * პაროლის დაყენება ადმინის მიერ.
   *
   * მიმდინარე პაროლი არ ითხოვება — ეს აღდგენის ინსტრუმენტია. ყველა
   * სესია უქმდება, რომ ძველი მოწყობილობებიდან წვდომა შეწყდეს.
   */
  async setPassword(id: string, dto: SetPasswordDto, actorId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await argon2.hash(dto.password) },
    });
    await this.tokens.revokeAllForUser(id);

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      description: dto.reason ?? 'პაროლი შეიცვალა ადმინის მიერ',
    });

    return { message: 'პაროლი შეიცვალა' };
  }

  async changeRole(id: string, dto: ChangeRoleDto, actorId: string) {
    const before = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');

    if (id === actorId) {
      throw new ForbiddenException('საკუთარი როლის შეცვლა შეუძლებელია');
    }

    // ბოლო Super Admin-ის ჩამოქვეითება სისტემას უმართავს დატოვებდა
    if (before.role === UserRole.SUPER_ADMIN && dto.role !== UserRole.SUPER_ADMIN) {
      await this.assertNotLastSuperAdmin(id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: USER_SELECT,
    });

    if (dto.role === UserRole.OPERATOR) {
      await this.prisma.operatorProfile.upsert({
        where: { userId: id },
        update: {},
        create: { userId: id },
      });
    }

    // როლი შეიცვალა — ძველი ტოკენები ძველ უფლებებს ატარებენ
    await this.tokens.revokeAllForUser(id);

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      before: { role: before.role },
      after: { role: dto.role },
      description: dto.reason ?? `როლი: ${before.role} → ${dto.role}`,
    });

    return user;
  }

  async changeStatus(id: string, dto: ChangeStatusDto, actorId: string) {
    const before = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');

    if (id === actorId) {
      throw new ForbiddenException('საკუთარი ანგარიშის დაბლოკვა შეუძლებელია');
    }

    if (before.role === UserRole.SUPER_ADMIN && dto.status !== UserStatus.ACTIVE) {
      await this.assertNotLastSuperAdmin(id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        deletedAt: dto.status === UserStatus.DELETED ? new Date() : null,
      },
      select: USER_SELECT,
    });

    if (dto.status !== UserStatus.ACTIVE) {
      await this.tokens.revokeAllForUser(id);
    }

    await this.audit.record({
      actorId,
      action: dto.status === UserStatus.DELETED ? AuditAction.DELETE : AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      before: { status: before.status },
      after: { status: dto.status },
      description: dto.reason ?? `სტატუსი: ${before.status} → ${dto.status}`,
    });

    return user;
  }

  /** გამოწერის ხელით გაცემა — გადახდის გარეშე. */
  async grantSubscription(userId: string, dto: GrantSubscriptionDto, actorId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');

    const plan = await this.prisma.plan.findFirst({
      where: { code: dto.planCode, deletedAt: null },
    });
    if (!plan) throw new BadRequestException(`პაკეტი "${dto.planCode}" ვერ მოიძებნა`);

    // ზუსტი ვადა უპირატესია დღეების დათვლაზე
    const periodEnd =
      dto.expiresAt ?? new Date(Date.now() + (dto.days ?? 30) * 24 * 60 * 60 * 1000);

    if (periodEnd <= new Date()) {
      throw new BadRequestException('ვადა მომავალში უნდა იყოს');
    }

    const subscription = await this.prisma.$transaction(async (tx) => {
      // ერთდროულად ერთი აქტიური გამოწერა
      await tx.subscription.updateMany({
        where: {
          userId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
        data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
      });

      return tx.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: periodEnd,
          grantedByUserId: actorId,
          grantedNote: dto.note,
        },
        include: { plan: { select: { code: true, name: true } } },
      });
    });

    this.entitlements.invalidate(userId);

    await this.audit.record({
      actorId,
      action: AuditAction.GRANT,
      entityType: 'Subscription',
      entityId: subscription.id,
      after: subscription,
      description:
        `"${plan.code}" გაიცა ${periodEnd.toISOString()}-მდე — ` +
        `${dto.note ?? 'მიზეზი მითითებული არ არის'}`,
    });

    return subscription;
  }

  /**
   * გამოწერის გაუქმება. მომხმარებელი უპაკეტოდ არ რჩება — ავტომატურად
   * ნაგულისხმევ (უფასო) პაკეტზე ბრუნდება, თორემ აპლიკაცია დაცარიელდებოდა.
   */
  async cancelSubscription(userId: string, reason: string | undefined, actorId: string) {
    const active = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { code: true, name: true, isDefault: true } } },
    });

    if (!active) throw new NotFoundException('აქტიური გამოწერა ვერ მოიძებნა');

    if (active.plan.isDefault) {
      throw new BadRequestException('ნაგულისხმევი პაკეტის გაუქმება შეუძლებელია');
    }

    const fallback = await this.prisma.plan.findFirst({
      where: { isDefault: true, status: 'ACTIVE', deletedAt: null },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: active.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelReason: reason,
        },
      });

      if (!fallback) return null;

      return tx.subscription.create({
        data: { userId, planId: fallback.id, status: SubscriptionStatus.ACTIVE },
        include: { plan: { select: { code: true, name: true } } },
      });
    });

    this.entitlements.invalidate(userId);

    await this.audit.record({
      actorId,
      action: AuditAction.REVOKE,
      entityType: 'Subscription',
      entityId: active.id,
      before: { plan: active.plan.code, status: active.status },
      after: { plan: fallback?.code ?? null },
      description: `"${active.plan.code}" გაუქმდა — ${reason ?? 'მიზეზი მითითებული არ არის'}`,
    });

    return result;
  }

  listAuditLogs(page = 1, perPage = 50) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
    });
  }

  private async assertNotLastSuperAdmin(excludeId: string): Promise<void> {
    const remaining = await this.prisma.user.count({
      where: {
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        NOT: { id: excludeId },
      },
    });

    if (remaining === 0) {
      throw new ForbiddenException(
        'ეს უკანასკნელი Super Admin-ია — ჯერ სხვა Super Admin შექმენით',
      );
    }
  }
}
