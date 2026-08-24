import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ChatService } from '../chat/chat.service';
import { SendMessageDto } from '../chat/dto/chat.dto';
import { ScheduleVideoVisitDto } from './dto/video-visit.dto';
import { VideoVisitsService } from './video-visits.service';
import { DAILY_CAPACITY, VISIT_CURRENCY, VISIT_PRICE_MINOR } from './video-visits.config';

/**
 * ვიდეო ვიზიტი — ერთჯერადი შეხვედრა ექიმთან.
 *
 * ჩატისგან სრულიად ცალკეა: ჩატი პაკეტში შედის, ვიდეო ვიზიტი კი
 * ცალკე იყიდება და დღეში შეზღუდული რაოდენობით ტარდება.
 */
@ApiTags('video-visits')
@Controller('video-visits')
export class VideoVisitsController {
  constructor(
    private readonly visits: VideoVisitsService,
    private readonly chat: ChatService,
  ) {}

  @Get('offer')
  @ApiOperation({ summary: 'ფასი და დღეების ტევადობა' })
  async offer() {
    return {
      amountMinor: VISIT_PRICE_MINOR,
      currency: VISIT_CURRENCY,
      price: `$${VISIT_PRICE_MINOR / 100}`,
      dailyCapacity: DAILY_CAPACITY,
      days: await this.visits.availability(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'ჩემი ვიდეო ჯავშნები' })
  mine(@CurrentUser('id') userId: string) {
    return this.visits.listForParent(userId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'ჩართვა — მშობლის მხრიდან' })
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.visits.joinAsParent(id, userId);
  }

  /**
   * ვიზიტის ჩატი.
   *
   * ჩვეულებრივი ჩატისგან ცალკეა, რადგან ის პაკეტის ფუნქციაა; ვიდეო
   * ვიზიტი კი ცალკე გადახდილია და პაკეტზე არ უნდა იყოს დამოკიდებული.
   */
  @Get(':id/messages')
  async messages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const conversationId = await this.visits.conversationFor(id, user.id, user.role);
    return this.chat.messages(conversationId, user.id, user.role);
  }

  @Post(':id/messages')
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const conversationId = await this.visits.conversationFor(id, user.id, user.role);
    return this.chat.send(conversationId, dto, user.id, user.role);
  }
}

@ApiTags('admin/video-visits')
@Controller('admin/video-visits')
export class AdminVideoVisitsController {
  constructor(
    private readonly visits: VideoVisitsService,
    private readonly chat: ChatService,
  ) {}

  @Get()
  @RequirePermission('video_visit.view')
  @ApiOperation({ summary: 'დღის რიგი' })
  queue(@Query('date') date?: string) {
    return this.visits.queue(date);
  }

  @Patch(':id/schedule')
  @RequirePermission('video_visit.schedule')
  @ApiOperation({ summary: 'ზუსტი საათის დანიშვნა — მშობელს SMS მიდის' })
  schedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ScheduleVideoVisitDto) {
    return this.visits.schedule(id, dto);
  }

  /** შეხვედრას მხოლოდ Super Admin ატარებს — შემოწმება სერვისშია. */
  @Post(':id/join')
  @RequirePermission('video_visit.view')
  @ApiOperation({ summary: 'ჩართვა — ექიმის მხრიდან' })
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visits.joinAsStaff(id, user.id, user.role);
  }

  @Get(':id/messages')
  @RequirePermission('video_visit.view')
  async messages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const conversationId = await this.visits.conversationFor(id, user.id, user.role);
    return this.chat.messages(conversationId, user.id, user.role);
  }

  @Post(':id/messages')
  @RequirePermission('video_visit.view')
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const conversationId = await this.visits.conversationFor(id, user.id, user.role);
    return this.chat.send(conversationId, dto, user.id, user.role);
  }

  @Patch(':id/finish')
  @RequirePermission('video_visit.schedule')
  finish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visits.finish(id, user.role);
  }
}
