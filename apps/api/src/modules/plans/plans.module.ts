import { Module } from '@nestjs/common';
import { AdminPlansController, PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  controllers: [PlansController, AdminPlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
