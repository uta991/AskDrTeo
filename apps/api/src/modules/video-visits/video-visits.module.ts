import { Global, Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { SmsModule } from '../sms/sms.module';
import { AdminVideoVisitsController, VideoVisitsController } from './video-visits.controller';
import { VideoVisitsService } from './video-visits.service';

// @Global — გადახდის დადასტურებას სჭირდება ჯავშნის შექმნა
@Global()
@Module({
  imports: [ChatModule, SmsModule],
  controllers: [VideoVisitsController, AdminVideoVisitsController],
  providers: [VideoVisitsService],
  exports: [VideoVisitsService],
})
export class VideoVisitsModule {}
