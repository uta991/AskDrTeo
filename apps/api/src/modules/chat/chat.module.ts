import { Module } from '@nestjs/common';
import { AdminChatController, ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController, AdminChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
