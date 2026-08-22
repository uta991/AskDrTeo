import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, DecideAppointmentDto } from './dto/appointment.dto';

/**
 * ვიზიტის ჯავშანი პედიატრთან.
 *
 * თავად ჯავშანი ყველა პაკეტშია — უფასო ვიზიტის კვოტა კი
 * `monthly_free_visit`-იდან მოდის და პრემიუმს აქვს.
 */
@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'ჩემი ჯავშნები' })
  list(@CurrentUser('id') userId: string) {
    return this.appointments.listForParent(userId);
  }

  @Get('quota')
  @ApiOperation({ summary: 'თვის უფასო ვიზიტების ნაშთი' })
  quota(@CurrentUser('id') userId: string) {
    return this.appointments.quota(userId);
  }

  @Post()
  @ApiOperation({ summary: 'ვიზიტის მოთხოვნა' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser('id') userId: string) {
    return this.appointments.create(dto, userId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.appointments.cancel(id, userId);
  }
}

@ApiTags('admin/appointments')
@Controller('admin/appointments')
export class AdminAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @RequirePermission('chat.view')
  list(@Query('status') status?: AppointmentStatus) {
    return this.appointments.listAll(status);
  }

  @Patch(':id/confirm')
  @RequirePermission('chat.reply')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointments.decide(id, AppointmentStatus.CONFIRMED, dto, user.role);
  }

  @Patch(':id/decline')
  @RequirePermission('chat.reply')
  decline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointments.decide(id, AppointmentStatus.DECLINED, dto, user.role);
  }

  @Patch(':id/done')
  @RequirePermission('chat.reply')
  done(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointments.decide(id, AppointmentStatus.DONE, dto, user.role);
  }
}
