import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequireFeature } from '@/common/decorators/require-feature.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { VaccinationsService } from './vaccinations.service';
import { CreateVaccineDto, MarkVaccinationDto, SaveHistoryDto } from './dto/vaccination.dto';

/**
 * აცრების კალენდარი — ფასიან პაკეტშია (`vaccination_calendar`).
 */
@ApiTags('vaccinations')
@Controller('children/:childId/vaccinations')
@RequireFeature('vaccination_calendar')
export class VaccinationsController {
  constructor(private readonly vaccinations: VaccinationsService) {}

  @Get()
  @ApiOperation({ summary: 'ბავშვის აცრების კალენდარი' })
  calendar(
    @Param('childId', ParseUUIDPipe) childId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vaccinations.calendar(childId, user.id, user.role);
  }

  @Get('history')
  @ApiOperation({
    summary: 'შესავსები ისტორია',
    description: 'მხოლოდ ის აცრები, რომლებიც ამ ასაკში უკვე უნდა ჰქონდეს.',
  })
  history(
    @Param('childId', ParseUUIDPipe) childId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vaccinations.pendingHistory(childId, user.id, user.role);
  }

  @Post('history')
  @ApiOperation({
    summary: 'ისტორიის შენახვა',
    description: 'დარჩენილი აცრები SMS-ით ეგზავნება მშობელს, ჯავშნის ბმულთან ერთად.',
  })
  saveHistory(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: SaveHistoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vaccinations.saveHistory(childId, dto, user.id, user.role);
  }

  @Patch(':vaccineId')
  @ApiOperation({ summary: 'აცრის მონიშვნა' })
  mark(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Param('vaccineId', ParseUUIDPipe) vaccineId: string,
    @Body() dto: MarkVaccinationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vaccinations.mark(childId, vaccineId, dto, user.id, user.role);
  }
}

/** ცნობარის მართვა — დოზირების მსგავსად, ადმინის უფლებაა. */
@ApiTags('admin/vaccines')
@Controller('admin/vaccines')
export class AdminVaccinesController {
  constructor(private readonly vaccinations: VaccinationsService) {}

  @Get()
  @RequirePermission('admin.manage')
  list() {
    return this.vaccinations.listCatalog();
  }

  @Post()
  @RequirePermission('admin.manage')
  create(@Body() dto: CreateVaccineDto, @CurrentUser('id') actorId: string) {
    return this.vaccinations.createVaccine(dto, actorId);
  }

  @Post('reminders/run')
  @RequirePermission('admin.manage')
  @ApiOperation({
    summary: 'შეხსენებების ხელით გაშვება',
    description: 'ჩვეულებრივ დღეში ერთხელ თავად ეშვება; ეს ხელით გაშვებაა.',
  })
  runReminders() {
    return this.vaccinations.sendUpcomingReminders().then((sent) => ({ sent }));
  }

  @Delete(':id')
  @RequirePermission('admin.manage')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.vaccinations.removeVaccine(id, actorId);
  }
}
