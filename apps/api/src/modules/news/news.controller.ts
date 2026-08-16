import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { NewsService } from './news.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'გამოქვეყნებული სიახლეები — მთავარი ეკრანის ლენტი' })
  list() {
    return this.news.listPublished();
  }
}

/**
 * სიახლეების მართვა.
 *
 * ოპერატორს მხოლოდ ტექსტური შეტყობინების გაგზავნა შეუძლია — ვიდეოს ან
 * ქავერის მიბმა ადმინის უფლებაა. სერვისი ამას თავად ამოწმებს, რადგან
 * როლი ერთ ენდპოინტზე ორ სხვადასხვა ქცევას განსაზღვრავს.
 */
@ApiTags('admin/news')
@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  @RequirePermission('admin.view')
  listAll(@Query() query: PaginationQueryDto) {
    return this.news.listAll(query.page, query.perPage);
  }

  @Post()
  @RequirePermission('notification.send')
  @ApiOperation({
    summary: 'ახალი სიახლე',
    description: 'publishNow: true — შექმნისთანავე ქვეყნდება და შეტყობინებები იგზავნება.',
  })
  create(@Body() dto: CreateNewsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.news.create(dto, actor.id, actor.role);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNewsDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.news.update(id, dto, actorId);
  }

  @Patch(':id/publish')
  @RequirePermission('notification.send')
  @ApiOperation({ summary: 'გამოქვეყნება და შეტყობინებების დაგზავნა' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.news.publish(id, actorId);
  }

  @Patch(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.news.archive(id, actorId);
  }
}
