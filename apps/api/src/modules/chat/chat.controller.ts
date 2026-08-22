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
import { SendMessageDto, StartConversationDto } from './dto/chat.dto';

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

  @Patch('conversations/:id/close')
  @RequirePermission('chat.assign')
  close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.chat.close(id, userId);
  }
}
