import { Global, Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { SmsModule } from '../sms/sms.module';
import { AdminVideoVisitsController, VideoVisitsController } from './video-visits.controller';
import { AgoraService } from './agora.service';
import { ConclusionPdfService } from './conclusion-pdf.service';
import { DiagnosesService } from './diagnoses.service';
import { VideoVisitsService } from './video-visits.service';

// @Global — გადახდის დადასტურებას სჭირდება ჯავშნის შექმნა
@Global()
@Module({
  imports: [ChatModule, SmsModule],
  controllers: [VideoVisitsController, AdminVideoVisitsController],
  providers: [VideoVisitsService, AgoraService, ConclusionPdfService, DiagnosesService],
  exports: [VideoVisitsService, DiagnosesService],
})
export class VideoVisitsModule {}
