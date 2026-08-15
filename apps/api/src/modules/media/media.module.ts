import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaAccessService } from './media-access.service';
import { MediaWebhookController } from './media-webhook.controller';
import { MediaWebhookService } from './media-webhook.service';
import { UploadPolicyService } from './upload-policy.service';

@Module({
  controllers: [MediaController, MediaWebhookController],
  providers: [MediaService, MediaAccessService, MediaWebhookService, UploadPolicyService],
  exports: [MediaService, MediaAccessService],
})
export class MediaModule {}
