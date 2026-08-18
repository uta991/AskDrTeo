import { Module } from '@nestjs/common';
import { AdminMilestonesController, MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  controllers: [MilestonesController, AdminMilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
