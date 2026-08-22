import { Module } from '@nestjs/common';
import { AdminVaccinesController, VaccinationsController } from './vaccinations.controller';
import { VaccinationsService } from './vaccinations.service';

@Module({
  controllers: [VaccinationsController, AdminVaccinesController],
  providers: [VaccinationsService],
  exports: [VaccinationsService],
})
export class VaccinationsModule {}
