import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PromoService } from './promo.service';
import { CreatePromoDto, RedeemPromoDto, UpdatePromoDto } from './dto/promo.dto';

@ApiTags('promo')
@Controller('promo')
export class PromoController {
  constructor(private readonly promo: PromoService) {}

  @Post('redeem')
  @ApiOperation({
    summary: 'პრომო კოდის გამოყენება',
    description: 'FREE_PLAN კოდი მაშინვე რთავს პაკეტს; DISCOUNT გადახდისას გამოიყენება.',
  })
  redeem(@CurrentUser('id') userId: string, @Body() dto: RedeemPromoDto) {
    return this.promo.redeem(userId, dto.code);
  }
}

@ApiTags('admin/promo')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/promo')
export class AdminPromoController {
  constructor(private readonly promo: PromoService) {}

  @Get()
  list() {
    return this.promo.list();
  }

  @Post()
  @ApiOperation({ summary: 'პრომო კოდის შექმნა' })
  create(@Body() dto: CreatePromoDto, @CurrentUser('id') actorId: string) {
    return this.promo.create(dto, actorId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.promo.update(id, dto, actorId);
  }
}
