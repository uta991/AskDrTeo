import { Body, Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Equals } from 'class-validator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';

/**
 * დადასტურება — ერთი შემთხვევითი მოთხოვნა (ან შეცდომით დაწერილი კოდი)
 * ანგარიშს არ უნდა შლიდეს. კლიენტი ამ სიტყვას მხოლოდ მაშინ აგზავნის,
 * როცა მომხმარებელმა წაშლა მეორედ დაადასტურა.
 */
export class DeleteOwnAccountDto {
  @Equals('DELETE', { message: 'წაშლა დადასტურებული არ არის' })
  confirm!: string;
}

@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(private readonly users: AdminUsersService) {}

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'საკუთარი ანგარიშის სამუდამო წაშლა',
    description: 'მხოლოდ მშობლისთვის. ბავშვები, ჩატები და ფაილები იშლება; გადახდები ბუღალტრულად რჩება.',
  })
  deleteOwn(@CurrentUser('id') userId: string, @Body() _dto: DeleteOwnAccountDto) {
    return this.users.deleteOwnAccount(userId);
  }
}
