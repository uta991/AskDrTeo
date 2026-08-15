import { Inject, Injectable, Logger } from '@nestjs/common';
import { StorageProvider, VideoStatus } from '@prisma/client';
import { extname } from 'node:path';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  FILE_STORAGE,
  VIDEO_STORAGE,
  type FileStorageProvider,
  type VideoStorageProvider,
} from '../storage/storage.types';

/**
 * მედიის სერვისი.
 *
 * კონკრეტული საცავი აქ არსად ფიგურირებს — მხოლოდ ინტერფეისები.
 * R2-დან S3-ზე ან Bunny-დან Mux-ზე გადასვლა ამ ფაილს არ შეეხება.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly files: FileStorageProvider,
    @Inject(VIDEO_STORAGE) private readonly videos: VideoStorageProvider,
  ) {}

  async uploadAvatar(file: Express.Multer.File, folder = 'avatars') {
    const stored = await this.files.upload({
      path: file.path,
      extension: extname(file.originalname).toLowerCase(),
      contentType: file.mimetype,
      folder,
    });

    return { url: stored.url, key: stored.key };
  }

  /**
   * ვიდეოს ატვირთვა და Video ჩანაწერის შექმნა.
   *
   * `providerAssetId` და `playbackId` ცალკე ინახება: პირველი პროვაიდერთან
   * მართვისთვისაა (წაშლა), მეორე — დაკვრისთვის. სხვა პროვაიდერზე
   * გადასვლისას ორივე თავისით ჯდება ადგილზე.
   */
  async createVideoFromUpload(file: Express.Multer.File, title: string | undefined) {
    const uploaded = await this.videos.upload({
      path: file.path,
      title: title?.trim() || 'ვიდეო',
      contentType: file.mimetype,
    });

    const slug = uploaded.assetId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);

    const video = await this.prisma.video.create({
      data: {
        slug: `${slug}-${Date.now().toString(36)}`,
        title: title?.trim() || 'ვიდეო',
        provider: this.providerEnum(),
        providerAssetId: uploaded.assetId,
        playbackId: uploaded.playbackId,
        thumbnailUrl: uploaded.thumbnailUrl,
        durationSec: uploaded.durationSec,
        status: VideoStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      select: { id: true, title: true, thumbnailUrl: true },
    });

    this.logger.log(`ვიდეო შეიქმნა: ${video.id} (${this.videos.name})`);
    return { videoId: video.id, title: video.title, thumbnailUrl: video.thumbnailUrl };
  }

  /** დაკვრის ბმული — ვადით, რომ გაზიარებით პაკეტს გვერდი არ აუარონ. */
  playbackUrl(playbackId: string, expiresInSec = 3600): Promise<string> {
    return this.videos.playbackUrl(playbackId, expiresInSec);
  }

  /** მიმდინარე პროვაიდერი ბაზის enum-ში. */
  private providerEnum(): StorageProvider {
    return this.videos.name === 'bunny'
      ? StorageProvider.BUNNY
      : StorageProvider.S3_CLOUDFRONT;
  }
}
