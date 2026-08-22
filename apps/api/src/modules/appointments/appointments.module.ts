import { Module } from '@nestjs/common';
import { AdminAppointmentsController, AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  controllers: [AppointmentsController, AdminAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
