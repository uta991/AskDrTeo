import { Module } from '@nestjs/common';
import { AiController, AiHealthController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController, AiHealthController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
