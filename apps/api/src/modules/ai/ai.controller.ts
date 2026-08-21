import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequireFeature } from '@/common/decorators/require-feature.decorator';
import { AiService } from './ai.service';
import { AskDto } from './dto/ai.dto';

/**
 * AI ასისტენტი — პრემიუმ პაკეტის ფუნქცია.
 *
 * წვდომას `ai_assistant` განსაზღვრავს და არა პაკეტის სახელი: რომელ
 * პაკეტში შედის, ადმინის გადასაწყვეტია და ბაზაშია.
 */
@ApiTags('ai')
@Controller('ai')
@RequireFeature('ai_assistant')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  @ApiOperation({ summary: 'ასისტენტი ჩართულია თუ არა' })
  status() {
    return { enabled: this.ai.enabled };
  }

  @Post('ask')
  // მოდელთან ყოველი მოთხოვნა ფულია — ლიმიტი ვიწროა განზრახ
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'შეკითხვა ასისტენტს' })
  ask(@Body() dto: AskDto, @CurrentUser('id') userId: string) {
    return this.ai.ask(dto, userId);
  }

  @Get('conversations')
  conversations(@CurrentUser('id') userId: string) {
    return this.ai.listConversations(userId);
  }

  @Get('conversations/:id')
  messages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.ai.messages(id, userId);
  }

  @Delete('conversations/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.ai.remove(id, userId);
  }
}
