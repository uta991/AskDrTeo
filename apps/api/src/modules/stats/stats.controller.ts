import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { StatsService } from './stats.service';

@ApiTags('admin/stats')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'დაშბორდი — მომხმარებლები, ბავშვები, გამოწერები' })
  overview() {
    return this.stats.overview();
  }

  @Get('financial')
  @ApiOperation({ summary: 'ფინანსური მაჩვენებლები და MRR' })
  financial() {
    return this.stats.financial();
  }
}
