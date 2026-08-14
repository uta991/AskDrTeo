import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, VideoStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** ატვირთვების საქაღალდე პროექტის ფესვთან. */
export const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // საქაღალდე პირველივე გაშვებაზე უნდა არსებობდეს, თორემ multer ჩავარდება
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  toPublicUrl(filename: string, userId: string): { url: string } {
    const base = this.config.get<string>('publicUrl', 'http://localhost:3000');
    const url = `${base}/uploads/${filename}`;

    this.logger.log(`ატვირთვა: ${filename} (user ${userId})`);
    return { url };
  }

  /**
   * ატვირთული ფაილიდან Video ჩანაწერი.
   *
   * slug-ს ფაილის სახელიდან ვიღებთ — უნიკალურია და ხელით შეყვანა
   * ადმინს ზედმეტ ნაბიჯს ჰმატებდა.
   */
  async createVideoFromUpload(filename: string, title: string | undefined, userId: string) {
    const { url } = this.toPublicUrl(filename, userId);
    const slug = filename.replace(/\.[^.]+$/, '');

    const video = await this.prisma.video.create({
      data: {
        slug,
        title: title?.trim() || 'ვიდეო',
        provider: StorageProvider.S3_CLOUDFRONT,
        playbackId: url,
        status: VideoStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      select: { id: true, title: true, playbackId: true },
    });

    return { videoId: video.id, title: video.title, url: video.playbackId };
  }
}
