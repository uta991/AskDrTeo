import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { MilestonesService } from './milestones.service';
import { AgeQueryDto, CreateQuestionDto, SubmitAssessmentDto } from './dto/milestone.dto';

@ApiTags('milestones')
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get('questions')
  @ApiOperation({
    summary: 'ასაკის კითხვები',
    description: 'წინა თვეების კითხვებიც შედის — უნარი ერთხელ ჩნდება და რჩება.',
  })
  questions(@Query() query: AgeQueryDto) {
    return this.milestones.questionsFor(query.ageMonths);
  }

  @Post('assessments')
  @ApiOperation({
    summary: 'კითხვარის შევსება',
    description:
      'ეს განვითარების მონიტორინგია და არა დიაგნოსტიკური ტესტი — შედეგი ' +
      'მიუთითებს, ღირს თუ არა ექიმთან საუბარი.',
  })
  submit(@Body() dto: SubmitAssessmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.milestones.submit(dto, actor.id, actor.role);
  }

  @Get('assessments/:childId')
  @ApiOperation({ summary: 'ბავშვის შეფასებების ისტორია' })
  history(
    @Param('childId', ParseUUIDPipe) childId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.milestones.history(childId, actor.id, actor.role);
  }
}

/**
 * კითხვების ცნობარი.
 *
 * `admin.manage` განზრახ — შინაარსი სამედიცინოა და ოპერატორს არ ეკუთვნის.
 */
@ApiTags('admin/milestones')
@Controller('admin/milestones')
export class AdminMilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get()
  @RequirePermission('admin.manage')
  listAll() {
    return this.milestones.listAll();
  }

  @Post()
  @RequirePermission('admin.manage')
  create(@Body() dto: CreateQuestionDto, @CurrentUser('id') actorId: string) {
    return this.milestones.createQuestion(dto, actorId);
  }

  @Patch(':id')
  @RequirePermission('admin.manage')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.milestones.updateQuestion(id, dto, actorId);
  }

  @Delete(':id')
  @RequirePermission('admin.manage')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.milestones.removeQuestion(id, actorId);
  }
}
