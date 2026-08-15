import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsString } from 'class-validator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PermissionsService } from './permissions.service';
import type { PermissionKey } from './permission-catalog';

class SetPermissionDto {
  @IsString()
  key!: PermissionKey;

  @IsBoolean()
  enabled!: boolean;
}

@ApiTags('admin/permissions')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'უფლებების კატალოგი როლების ჭრილში' })
  catalog() {
    return this.permissions.catalog();
  }

  @Patch(':role')
  @ApiOperation({
    summary: 'უფლების ჩართვა/გამორთვა როლზე',
    description: 'SUPER_ADMIN-ს ყველა უფლება ავტომატურად აქვს — რედაქტირება არ ხდება.',
  })
  set(
    @Param('role') role: UserRole,
    @Body() dto: SetPermissionDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.permissions.setForRole(role, dto.key, dto.enabled, actorId);
  }
}
