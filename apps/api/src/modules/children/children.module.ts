import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AdminChildrenController } from './admin-children.controller';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';

@Module({
  // MediaAccessService — ავატარების ხელმოწერილი ბმულებისთვის
  imports: [MediaModule],
  controllers: [ChildrenController, AdminChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
