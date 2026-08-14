import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';
import {
  CancelSubscriptionDto,
  ChangeRoleDto,
  ChangeStatusDto,
  CreateStaffDto,
  GrantSubscriptionDto,
  ListUsersQueryDto,
  PaginationQueryDto,
  SetPasswordDto,
} from './dto/admin-user.dto';

@ApiTags('admin/users')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'მომხმარებლების სია ფილტრებით და გვერდებით' })
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Get('audit-logs')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ვინ რა შეცვალა — სისტემის ისტორია' })
  auditLogs(@Query() query: PaginationQueryDto) {
    return this.users.listAuditLogs(query.page, query.perPage);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Post(':id/grant-subscription')
  @ApiOperation({ summary: 'გამოწერის ხელით გაცემა (გადახდის გარეშე)' })
  grantSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantSubscriptionDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.users.grantSubscription(id, dto, actorId);
  }

  @Post(':id/cancel-subscription')
  @ApiOperation({
    summary: 'გამოწერის გაუქმება',
    description: 'მომხმარებელი ავტომატურად ბრუნდება ნაგულისხმევ (უფასო) პაკეტზე.',
  })
  cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.users.cancelSubscription(id, dto.reason, actorId);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ბლოკირება / განბლოკვა / წაშლა — ანგარიშის მართვაა' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.users.changeStatus(id, dto, actorId);
  }

  // ─── მხოლოდ Super Admin: ანგარიშების მართვა ──────────────────────────
  // შექმნა, როლის ცვლილება, ბლოკირება და წაშლა ერთ ჯგუფშია — ესაა
  // ზუსტად ის უფლება, რომელიც ადმინს არ აქვს

  @Post('staff')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'ანგარიშის შექმნა',
    description: 'მშობელი, ოპერატორი, ადმინი ან Super Admin. SMS დადასტურება არ სჭირდება.',
  })
  createStaff(@Body() dto: CreateStaffDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.createStaff(dto, actor.id, actor.role);
  }

  @Patch(':id/password')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'პაროლის დაყენება — ყველა სესია უქმდება' })
  setPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPasswordDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.users.setPassword(id, dto, actorId);
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'როლის შეცვლა — ძველი სესიები უქმდება' })
  changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.users.changeRole(id, dto, actorId);
  }
}
