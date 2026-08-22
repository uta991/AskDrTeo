import { Module } from '@nestjs/common';
import { AiController, AiHealthController } from './ai.controller';
import { AiService } from './ai.service';
import { AiToolsService } from './ai.tools';

@Module({
  controllers: [AiController, AiHealthController],
  providers: [AiService, AiToolsService],
  exports: [AiService],
})
export class AiModule {}
