import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConversationStatus, UserRole } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { RequireFeature } from '@/common/decorators/require-feature.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ChatService } from './chat.service';
import { Public } from '@/common/decorators/public.decorator';
import { RateConversationDto, SendMessageDto, StartConversationDto } from './dto/chat.dto';

/**
 * მშობლის ჩატი კონსულტანტთან.
 *
 * წვდომა `chat_with_operator`-ზეა მიბმული — უფასო პაკეტში არ შედის.
 */
@ApiTags('chat')
@Controller('chat')
@RequireFeature('chat_with_operator')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'ჩემი საუბრები' })
  list(@CurrentUser('id') userId: string) {
    return this.chat.listForParent(userId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'ახალი შეკითხვა' })
  start(@Body() dto: StartConversationDto, @CurrentUser('id') userId: string) {
    return this.chat.start(dto, userId);
  }

  @Get('conversations/:id')
  messages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.messages(id, user.id, user.role);
  }

  @Post('conversations/:id/messages')
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chat.send(id, dto, user.id, user.role);
  }
}

/**
 * ოპერატორის მხარე.
 *
 * `chat.view` / `chat.reply` ოპერატორსაც აქვს და ადმინსაც — მშობლის
 * შეკითხვაზე პასუხი ოპერატორის ძირითადი საქმეა.
 */
/**
 * შეფასების ბმული SMS-იდან.
 *
 * `@Public` — ბმული ერთჯერადი token-ით იცავს თავს. ავტორიზაციის
 * მოთხოვნა შეფასებას მოკლავდა: მშობელი ტელეფონში შესული ხშირად არაა.
 */
@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly chat: ChatService) {}

  @Public()
  @Get(':token')
  show(@Param('token') token: string) {
    return this.chat.feedbackByToken(token);
  }

  @Public()
  @Post(':token')
  rate(@Param('token') token: string, @Body() dto: RateConversationDto) {
    return this.chat.rate(token, dto);
  }
}

@ApiTags('admin/chat')
@Controller('admin/chat')
export class AdminChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  @RequirePermission('chat.view')
  @ApiOperation({
    summary: 'შეკითხვების რიგი',
    description: 'პრიორიტეტული პაკეტის მშობელი წინ დგება.',
  })
  queue(@Query('status') status?: ConversationStatus) {
    return this.chat.queue(status);
  }

  @Get('conversations/:id')
  @RequirePermission('chat.view')
  messages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.messages(id, user.id, user.role);
  }

  @Post('conversations/:id/messages')
  @RequirePermission('chat.reply')
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chat.send(id, dto, user.id, user.role ?? UserRole.OPERATOR);
  }

  @Get('users/:userId/conversations')
  @RequirePermission('chat.view')
  @ApiOperation({
    summary: 'მომხმარებლის ჩატის ისტორია',
    description: 'რა თარიღში მოიწერა, ვინ უპასუხა და რაზე იყო საუბარი.',
  })
  userHistory(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.chat.historyFor(userId);
  }

  @Get('feedback')
  @RequirePermission('chat.view')
  @ApiOperation({
    summary: 'მშობლების შეფასებები',
    description: '`operatorId` — კონკრეტული ოპერატორის ან ადმინის შეფასებები.',
  })
  feedback(@Query('operatorId') operatorId?: string) {
    return this.chat.feedbackSummary(operatorId);
  }

  @Patch('conversations/:id/take')
  @RequirePermission('chat.reply')
  @ApiOperation({
    summary: 'საუბრის აღება',
    description: 'ოპერატორი მიემაგრება და მშობელს საკუთარი სახელით ესალმება.',
  })
  take(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.chat.take(id, userId);
  }

  @Patch('conversations/:id/close')
  @RequirePermission('chat.reply')
  close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.chat.close(id, userId);
  }
}
