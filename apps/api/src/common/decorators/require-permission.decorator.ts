import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@/modules/permissions/permission-catalog';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * ენდპოინტი მოითხოვს კონკრეტულ უფლებას.
 *
 *   @RequirePermission('video.create')
 *
 * როლი აქ არ ფიგურირებს — რომელ როლს აქვს ეს უფლება, ბაზაში წყდება
 * და Super Admin-ს პანელიდან იცვლება.
 */
export const RequirePermission = (permission: PermissionKey) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
