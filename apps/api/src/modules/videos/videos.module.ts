import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AdminVideosController, VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  imports: [StorageModule],
  controllers: [VideosController, AdminVideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
