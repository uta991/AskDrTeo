import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaAccessService } from './media-access.service';
import { MediaWebhookController } from './media-webhook.controller';
import { MediaWebhookService } from './media-webhook.service';

@Module({
  controllers: [MediaController, MediaWebhookController],
  providers: [MediaService, MediaAccessService, MediaWebhookService],
  exports: [MediaService, MediaAccessService],
})
export class MediaModule {}
