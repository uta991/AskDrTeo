import { Module } from '@nestjs/common';
import { VideoVisitsModule } from '../video-visits/video-visits.module';
import { AdminPromoController, PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  imports: [VideoVisitsModule],
  controllers: [PromoController, AdminPromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
