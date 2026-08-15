import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { PermissionKey } from './permission-catalog';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  keys: Set<string>;
  expiresAt: number;
}

/**
 * უფლებების შემოწმება.
 *
 * კოდი როლს აღარ ამოწმებს — მხოლოდ უფლების key-ს. `if (role === ADMIN)`
 * გაფანტული შემოწმებები ნიშნავდა, რომ ახალი როლის ან გამონაკლისის
 * დამატება ათეულ ფაილში ცვლილებას მოითხოვდა.
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly cache = new Map<UserRole, CacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * აქვს თუ არა უფლება.
   *
   * SUPER_ADMIN ყოველთვის `true` — ბაზას არ ეკითხება. ეს განზრახაა:
   * ახალი უფლების seed-ში მიბმის დავიწყება Super Admin-ს საკუთარ
   * სისტემაში არ უნდა შეზღუდავდეს.
   */
  async has(userId: string, key: PermissionKey): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { role: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) return false;
    if (user.role === UserRole.SUPER_ADMIN) return true;

    return (await this.forRole(user.role)).has(key);
  }

  async assert(userId: string, key: PermissionKey): Promise<void> {
    if (!(await this.has(userId, key))) {
      throw new ForbiddenException({
        message: 'ამ მოქმედების უფლება არ გაქვთ',
        requiredPermission: key,
      });
    }
  }

  /** როლის უფლებები — ინტერფეისისთვის და შემოწმებისთვის. */
  async forRole(role: UserRole): Promise<Set<string>> {
    if (role === UserRole.SUPER_ADMIN) {
      const all = await this.prisma.permission.findMany({ select: { key: true } });
      return new Set(all.map((p) => p.key));
    }

    const cached = this.cache.get(role);
    if (cached && cached.expiresAt > Date.now()) return cached.keys;

    const rows = await this.prisma.rolePermission.findMany({
      where: { role },
      select: { permission: { select: { key: true } } },
    });

    const keys = new Set(rows.map((row) => row.permission.key));
    this.cache.set(role, { keys, expiresAt: Date.now() + CACHE_TTL_MS });

    return keys;
  }

  /** კატალოგი ჯგუფებად — Super Admin-ის პანელისთვის. */
  async catalog() {
    const [permissions, assignments] = await Promise.all([
      this.prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }] }),
      this.prisma.rolePermission.findMany({ select: { role: true, permissionId: true } }),
    ]);

    const byRole = new Map<UserRole, Set<string>>();
    for (const row of assignments) {
      const set = byRole.get(row.role) ?? new Set();
      set.add(row.permissionId);
      byRole.set(row.role, set);
    }

    return permissions.map((permission) => ({
      key: permission.key,
      group: permission.group,
      name: permission.name,
      roles: {
        OPERATOR: byRole.get(UserRole.OPERATOR)?.has(permission.id) ?? false,
        ADMIN: byRole.get(UserRole.ADMIN)?.has(permission.id) ?? false,
        // ყოველთვის ჩართული და შეუცვლელი
        SUPER_ADMIN: true,
      },
    }));
  }

  /**
   * უფლების ჩართვა/გამორთვა როლზე.
   *
   * SUPER_ADMIN-ის რედაქტირება დაბლოკილია: მისი უფლებები ბაზაზე არ
   * არის დამოკიდებული, ამიტომ ცვლილება ილუზიას შექმნიდა — ინტერფეისში
   * გამორთული აღმოჩნდებოდა, სინამდვილეში კი იმუშავებდა.
   */
  async setForRole(
    role: UserRole,
    key: PermissionKey,
    enabled: boolean,
    actorId: string,
  ): Promise<{ role: UserRole; key: string; enabled: boolean }> {
    if (role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'Super Admin-ს ყველა უფლება ავტომატურად აქვს — რედაქტირება არ ხდება',
      );
    }
    if (role === UserRole.PARENT) {
      throw new BadRequestException('მშობლის უფლებები პაკეტით განისაზღვრება, არა როლით');
    }

    const permission = await this.prisma.permission.findUnique({ where: { key } });
    if (!permission) throw new NotFoundException(`უფლება "${key}" ვერ მოიძებნა`);

    const existing = await this.prisma.rolePermission.findUnique({
      where: { role_permissionId: { role, permissionId: permission.id } },
    });

    const before = !!existing;
    if (before === enabled) return { role, key, enabled };

    if (enabled) {
      await this.prisma.rolePermission.create({
        data: { role, permissionId: permission.id, grantedById: actorId },
      });
    } else {
      await this.prisma.rolePermission.delete({ where: { id: existing!.id } });
    }

    this.cache.delete(role);

    await this.audit.record({
      actorId,
      action: enabled ? AuditAction.GRANT : AuditAction.REVOKE,
      entityType: 'RolePermission',
      entityId: permission.id,
      before: { role, permission: key, enabled: before },
      after: { role, permission: key, enabled },
      description: `${role}: ${key} ${enabled ? 'ჩაირთო' : 'გამოირთო'}`,
    });

    this.logger.log(`${role}: ${key} → ${enabled}`);
    return { role, key, enabled };
  }

  invalidate(): void {
    this.cache.clear();
  }
}
