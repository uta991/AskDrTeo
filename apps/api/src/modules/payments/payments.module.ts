import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TbcClient } from './tbc.client';

@Module({
  imports: [SmsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, TbcClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
