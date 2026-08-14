import { Module } from '@nestjs/common';
import { AdminPromoController, PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  controllers: [PromoController, AdminPromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
