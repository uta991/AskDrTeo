import { Global, Module } from '@nestjs/common';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';

/**
 * Global — რადგან ნებისმიერ მოდულს შეიძლება დასჭირდეს წვდომის შემოწმება,
 * ხოლო FeatureGuard გლობალურად არის რეგისტრირებული.
 */
@Global()
@Module({
  controllers: [EntitlementsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
