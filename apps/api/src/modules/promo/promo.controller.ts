import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
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
@Controller('admin/promo')
export class AdminPromoController {
  constructor(private readonly promo: PromoService) {}

  @Get()
  @RequirePermission('subscription.view')
  list() {
    return this.promo.list();
  }

  @Post()
  @RequirePermission('subscription.manage')
  @ApiOperation({ summary: 'პრომო კოდის შექმნა' })
  create(@Body() dto: CreatePromoDto, @CurrentUser('id') actorId: string) {
    return this.promo.create(dto, actorId);
  }

  @Delete(':id')
  @RequirePermission('subscription.manage')
  @ApiOperation({
    summary: 'პრომო კოდის წაშლა',
    description: 'სიიდან ქრება; გამოსყიდვების ისტორია რჩება.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string) {
    return this.promo.remove(id, actorId);
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
