import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { StatsService } from './stats.service';

@ApiTags('admin/stats')
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @RequirePermission('admin.view')
  @ApiOperation({ summary: 'დაშბორდი — მომხმარებლები, ბავშვები, გამოწერები' })
  overview() {
    return this.stats.overview();
  }

  @Get('financial')
  @RequirePermission('admin.view')
  @ApiOperation({ summary: 'ფინანსური მაჩვენებლები და MRR' })
  financial() {
    return this.stats.financial();
  }
}
