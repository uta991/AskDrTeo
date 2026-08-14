import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** ენდპოინტზე დაშვებული როლები. მაგ: @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
