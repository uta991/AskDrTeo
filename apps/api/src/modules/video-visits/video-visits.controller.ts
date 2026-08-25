import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ChatService } from '../chat/chat.service';
import { SendMessageDto } from '../chat/dto/chat.dto';
import {
  CancelVideoVisitDto,
  RequestVideoVisitDto,
  ScheduleVideoVisitDto,
} from './dto/video-visit.dto';
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
  @ApiOperation({ summary: 'ფასი, დღეების ტევადობა და მოქმედი უფლებები' })
  async offer(@CurrentUser('id') userId: string) {
    const [days, credits, pricing] = await Promise.all([
      this.visits.availability(),
      this.visits.credits(userId),
      this.visits.priceFor(userId),
    ]);

    const free = credits.filter((credit) => credit.coverPercent >= 100).length;

    return {
      currency: VISIT_CURRENCY,
      /** ჩვეულებრივი ფასი */
      basePrice: money(VISIT_PRICE_MINOR),
      baseAmountMinor: VISIT_PRICE_MINOR,
      /** რა დახვდება მშობელს ახლა — ფასდაკლება უკვე გათვალისწინებულია */
      amountMinor: pricing.amountMinor,
      price: money(pricing.amountMinor),
      /** რამდენი პროცენტი ეფარება მოქმედი უფლებით */
      coverPercent: pricing.coverPercent,
      dailyCapacity: DAILY_CAPACITY,
      days,
      /** უფასო ვიზიტების ნაშთი — პრომო კოდიდან */
      freeCredits: free,
    };
  }

  /**
   * ჯავშანი უფასო უფლებით.
   *
   * ცალკე მისამართია და არა გადახდის ნაწილი: აქ ბანკი საერთოდ არ
   * მონაწილეობს და პასუხი მაშინვე ბრუნდება.
   */
  @Post('free')
  @ApiOperation({ summary: 'ჯავშანი უფასო უფლებით — პრომო კოდიდან' })
  bookFree(@Body() dto: RequestVideoVisitDto, @CurrentUser('id') userId: string) {
    return this.visits.bookWithCredit({
      parentId: userId,
      date: new Date(dto.date),
      childId: dto.childId,
      reason: dto.reason,
    });
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

  @Get(':id/presence')
  @ApiOperation({ summary: 'ვინ არის ოთახში ახლა' })
  presence(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visits.presence(id, user.id, user.role);
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

  @Get(':id/presence')
  @RequirePermission('video_visit.view')
  presence(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visits.presence(id, user.id, user.role);
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

  @Patch(':id/cancel')
  @RequirePermission('video_visit.schedule')
  @ApiOperation({ summary: 'ვიზიტის გაუქმება — მშობელს SMS მიდის' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelVideoVisitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visits.cancel(id, dto, user.role);
  }

  @Patch(':id/finish')
  @RequirePermission('video_visit.schedule')
  finish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visits.finish(id, user.role);
  }
}

/** ცენტები დოლარად — მრგვალი თანხა ცენტების გარეშე. */
function money(minor: number): string {
  const amount = minor / 100;
  return `$${minor % 100 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}
