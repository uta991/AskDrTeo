import { Global, Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AdminVaccinesController, VaccinationsController } from './vaccinations.controller';
import { VaccinationsService } from './vaccinations.service';

@Global()
@Module({
  imports: [SmsModule],
  controllers: [VaccinationsController, AdminVaccinesController],
  providers: [VaccinationsService],
  exports: [VaccinationsService],
})
export class VaccinationsModule {}
