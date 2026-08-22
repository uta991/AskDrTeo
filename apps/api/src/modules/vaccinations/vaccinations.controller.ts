import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequireFeature } from '@/common/decorators/require-feature.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { VaccinationsService } from './vaccinations.service';
import { CreateVaccineDto, MarkVaccinationDto } from './dto/vaccination.dto';

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

  @Delete(':id')
  @RequirePermission('admin.manage')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.vaccinations.removeVaccine(id, actorId);
  }
}
