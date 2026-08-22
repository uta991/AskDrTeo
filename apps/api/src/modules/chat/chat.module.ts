import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AdminChatController, ChatController, FeedbackController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [SmsModule],
  controllers: [ChatController, AdminChatController, FeedbackController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
