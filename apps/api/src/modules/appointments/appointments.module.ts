import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AdminAppointmentsController, AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [SmsModule],
  controllers: [AppointmentsController, AdminAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
