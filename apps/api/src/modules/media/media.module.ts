import { Module } from '@nestjs/common';
import { NewsModule } from '../news/news.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaAccessService } from './media-access.service';
import { MediaWebhookController } from './media-webhook.controller';
import { MediaWebhookService } from './media-webhook.service';
import { UploadPolicyService } from './upload-policy.service';
import { MediaCleanupService } from './media-cleanup.service';

@Module({
  // webhook-ს სიახლეების გამოქვეყნება სჭირდება, როცა ვიდეო მზადდება
  imports: [NewsModule],
  controllers: [MediaController, MediaWebhookController],
  providers: [
    MediaService,
    MediaAccessService,
    MediaWebhookService,
    UploadPolicyService,
    MediaCleanupService,
  ],
  exports: [MediaService, MediaAccessService, MediaCleanupService],
})
export class MediaModule {}
