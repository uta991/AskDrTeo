import { Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

/**
 * შეტყობინებების ზარი.
 *
 * ერთი და იგივე ენდპოინტი ემსახურება მშობელსაც და პერსონალსაც —
 * განსხვავება მხოლოდ იმაშია, ვის რა შეტყობინება ეგზავნება.
 */
@ApiTags('notifications')
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'ჩემი შეტყობინებები და წაუკითხავის რაოდენობა' })
  feed(@CurrentUser('id') userId: string) {
    return this.notifications.feed(userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.notifications.markRead(id, userId);
  }
}
