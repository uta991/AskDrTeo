import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequireFeature } from '@/common/decorators/require-feature.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { VideosService } from './videos.service';
import { SaveProgressDto, UpdateVideoDto } from './dto/video.dto';

/**
 * ვიდეო ბიბლიოთეკა.
 *
 * `video_library` ყველა პაკეტშია, მაგრამ მნიშვნელობით განსხვავდება:
 * უფასოში `free_only`, ფასიანში `all`.
 */
@ApiTags('videos')
@Controller('videos')
@RequireFeature('video_library')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Get()
  @ApiOperation({ summary: 'ბიბლიოთეკა' })
  list(@CurrentUser() user: AuthenticatedUser, @Query('category') category?: string) {
    return this.videos.list(user.id, user.role, category);
  }

  @Get('categories')
  categories() {
    return this.videos.categories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'ერთი ვიდეო' })
  findOne(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.videos.findOne(slug, user.id, user.role);
  }

  @Post(':id/progress')
  @ApiOperation({ summary: 'ყურების პროგრესი' })
  progress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveProgressDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.videos.saveProgress(id, dto.positionSec, userId);
  }
}

@ApiTags('admin/videos')
@Controller('admin/videos')
export class AdminVideosController {
  constructor(private readonly videos: VideosService) {}

  @Get()
  @RequirePermission('video.update')
  list() {
    return this.videos.listAll();
  }

  @Patch(':id')
  @RequirePermission('video.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVideoDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.videos.update(id, dto, actorId);
  }

  @Delete(':id')
  @RequirePermission('video.delete')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.videos.remove(id, actorId);
  }
}
