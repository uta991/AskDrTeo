import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import type {
  UploadVideoInput,
  UploadedVideo,
  VideoStorageProvider,
} from '../storage.types';
import { UPLOAD_DIR } from './local-file.provider';

/**
 * ლოკალური ვიდეო — მხოლოდ დეველოპმენტისთვის.
 *
 * ადაპტური ხარისხი და transcoding არ აქვს: ფაილი ისე ისმევა, როგორც
 * აიტვირთა. პროდაქშენში Bunny ჩაირთვება.
 */
@Injectable()
export class LocalVideoProvider implements VideoStorageProvider {
  readonly name = 'local';
  private readonly logger = new Logger(LocalVideoProvider.name);

  constructor(private readonly config: ConfigService) {}

  async upload(input: UploadVideoInput): Promise<UploadedVideo> {
    const folder = join(UPLOAD_DIR, 'videos');
    mkdirSync(folder, { recursive: true });

    const name = `${randomBytes(16).toString('hex')}.mp4`;
    renameSync(input.path, join(folder, name));

    const base = this.config.get<string>('publicUrl', 'http://localhost:3000');
    this.logger.log(`ლოკალური ვიდეო: ${name}`);

    return {
      assetId: name,
      playbackId: `${base}/uploads/videos/${name}`,
      thumbnailUrl: null,
      // ხანგრძლივობის დასადგენად ffprobe დაგვჭირდებოდა — ლოკალურად ღირს
      durationSec: 0,
    };
  }

  async remove(assetId: string): Promise<void> {
    rmSync(join(UPLOAD_DIR, 'videos', assetId), { force: true });
  }

  async playbackUrl(playbackId: string): Promise<string> {
    // ლოკალურად ხელმოწერა არ არის — მისამართი პირდაპირ ისმევა
    return playbackId;
  }
}
