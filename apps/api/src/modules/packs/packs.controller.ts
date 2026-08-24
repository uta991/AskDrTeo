import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PacksService } from './packs.service';

@ApiTags('packs')
@Controller('packs')
export class PacksController {
  constructor(private readonly packs: PacksService) {}

  @Get()
  @ApiOperation({ summary: 'კონსულტაციის პაკეტები და ჩემი ნაშთი' })
  overview(@CurrentUser('id') userId: string) {
    return this.packs.overview(userId);
  }
}
