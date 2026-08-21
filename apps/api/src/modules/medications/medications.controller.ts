import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequireFeature } from '@/common/decorators/require-feature.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto, UpdateMedicationDto } from './dto/medication.dto';

@ApiTags('medications')
@Controller('medications')
export class MedicationsController {
  constructor(private readonly medications: MedicationsService) {}

  @Get()
  // კალკულატორი ფასიან პაკეტშია — უფასოში ღილაკიც არ ჩანს, მაგრამ
  // წვდომა სერვერზე უნდა შემოწმდეს და არა მხოლოდ ინტერფეისში
  @RequireFeature('dose_calculator')
  @ApiOperation({ summary: 'დოზის კალკულატორის ცნობარი' })
  list() {
    return this.medications.listActive();
  }
}

/**
 * ცნობარის მართვა.
 *
 * `admin.manage` განზრახ — დოზირება სამედიცინო შინაარსია და ოპერატორს
 * არ ეკუთვნის; შეცდომა პირდაპირ ბავშვის უსაფრთხოებაზე აისახება.
 */
@ApiTags('admin/medications')
@Controller('admin/medications')
export class AdminMedicationsController {
  constructor(private readonly medications: MedicationsService) {}

  @Get()
  @RequirePermission('admin.manage')
  listAll() {
    return this.medications.listAll();
  }

  @Post()
  @RequirePermission('admin.manage')
  @ApiOperation({ summary: 'ახალი წამალი ცნობარში' })
  create(@Body() dto: CreateMedicationDto, @CurrentUser('id') actorId: string) {
    return this.medications.create(dto, actorId);
  }

  @Patch(':id')
  @RequirePermission('admin.manage')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicationDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.medications.update(id, dto, actorId);
  }

  @Delete(':id')
  @RequirePermission('admin.manage')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.medications.remove(id, actorId);
  }
}
