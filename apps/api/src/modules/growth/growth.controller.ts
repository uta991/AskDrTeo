import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequireFeature } from '@/common/decorators/require-feature.decorator';
import { GrowthService } from './growth.service';
import { CreateGrowthEntryDto } from './dto/growth.dto';

/**
 * ზრდის დღიური — წონა, სიმაღლე, თავის გარშემოწერილობა.
 *
 * ფასიან პაკეტშია (`growth_tracking`).
 */
@ApiTags('growth')
@Controller('children/:childId/growth')
@RequireFeature('growth_tracking')
export class GrowthController {
  constructor(private readonly growth: GrowthService) {}

  @Get()
  @ApiOperation({ summary: 'გაზომვების ისტორია' })
  list(@Param('childId', ParseUUIDPipe) childId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.growth.list(childId, user.id, user.role);
  }

  @Post()
  @ApiOperation({ summary: 'ახალი გაზომვა' })
  create(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: CreateGrowthEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.growth.create(childId, dto, user.id, user.role);
  }

  @Delete(':entryId')
  remove(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.growth.remove(entryId, user.id, user.role);
  }
}
