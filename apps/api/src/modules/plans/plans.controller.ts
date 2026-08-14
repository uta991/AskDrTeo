import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { PlanStatus, UserRole } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PlansService } from './plans.service';
import {
  CreateFeatureDto,
  CreatePlanDto,
  UpdateFeatureDto,
  UpdatePlanDto,
} from './dto/plan.dto';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'აქტიური პაკეტები — გამოწერის ეკრანისთვის' })
  listPublic() {
    return this.plans.listPublic();
  }
}

/**
 * პაკეტების მართვა. მთელი ეს კონტროლერი მხოლოდ Super Admin-ისთვისაა —
 * ესაა ის ადგილი, სადაც პროექტის ბიზნეს-მოდელი იცვლება deploy-ის გარეშე.
 */
@ApiTags('admin/plans')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly plans: PlansService) {}

  // ─── ფუნქციების კატალოგი ─────────────────────────────────────────────

  @Get('features')
  @ApiOperation({ summary: 'ფუნქციების კატალოგი' })
  listFeatures() {
    return this.plans.listFeatures();
  }

  @Post('features')
  @ApiOperation({ summary: 'ახალი ფუნქციის შექმნა (კოდის ცვლილების გარეშე)' })
  createFeature(@Body() dto: CreateFeatureDto, @CurrentUser('id') actorId: string) {
    return this.plans.createFeature(dto, actorId);
  }

  @Patch('features/:id')
  updateFeature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeatureDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.plans.updateFeature(id, dto, actorId);
  }

  // ─── პაკეტები ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'ყველა პაკეტი (DRAFT და ARCHIVED-ის ჩათვლით)' })
  listAll() {
    return this.plans.listAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'ახალი პაკეტი — იქმნება DRAFT სტატუსით' })
  create(@Body() dto: CreatePlanDto, @CurrentUser('id') actorId: string) {
    return this.plans.create(dto, actorId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'პაკეტის რედაქტირება (ფასები/ფუნქციები სრულად ჩანაცვლდება)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.plans.update(id, dto, actorId);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'პაკეტის გამოქვეყნება — ჩნდება აპლიკაციაში' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.plans.setStatus(id, PlanStatus.ACTIVE, actorId);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'ნაგულისხმევად დაყენება — ახალი მომხმარებლები ამას მიიღებენ' })
  setDefault(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.plans.setDefault(id, actorId);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'არქივირება — არსებული გამოწერები რჩება ძალაში' })
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.plans.archive(id, actorId);
  }
}
