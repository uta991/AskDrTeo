import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MediaSource,
  MediaStatus,
  MediaType,
  StorageProvider,
  VideoStatus,
} from '@prisma/client';
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

  /**
   * სურათის ატვირთვა და MediaAsset-ის შექმნა.
   *
   * ბაზაში მხოლოდ მეტამონაცემი ჯდება — თავად ფაილი პროვაიდერთანაა.
   */
  async uploadImage(
    file: Express.Multer.File,
    ownerId: string,
    source: MediaSource = MediaSource.PROFILE,
  ) {
    const stored = await this.files.upload({
      path: file.path,
      extension: extname(file.originalname).toLowerCase(),
      contentType: file.mimetype,
      folder: source.toLowerCase(),
    });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerId,
        type: MediaType.IMAGE,
        source,
        status: MediaStatus.READY,
        provider: this.fileProviderEnum(),
        storageKey: stored.key,
        publicUrl: stored.url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      select: { id: true, publicUrl: true, storageKey: true },
    });

    return { assetId: asset.id, url: asset.publicUrl, key: asset.storageKey };
  }

  /**
   * ვიდეოს ატვირთვა და Video ჩანაწერის შექმნა.
   *
   * `providerAssetId` და `playbackId` ცალკე ინახება: პირველი პროვაიდერთან
   * მართვისთვისაა (წაშლა), მეორე — დაკვრისთვის. სხვა პროვაიდერზე
   * გადასვლისას ორივე თავისით ჯდება ადგილზე.
   */
  async createVideoFromUpload(
    file: Express.Multer.File,
    title: string | undefined,
    ownerId: string,
  ) {
    const uploaded = await this.videos.upload({
      path: file.path,
      title: title?.trim() || 'ვიდეო',
      contentType: file.mimetype,
    });

    // MediaAsset ჯერ — ფაილის ადგილი; Video მერე — ბიზნეს-ინფორმაცია
    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerId,
        type: MediaType.VIDEO,
        source: MediaSource.ADMIN,
        // transcoding პროვაიდერთან გრძელდება — READY webhook-ით დადგება
        status: MediaStatus.PROCESSING,
        provider: this.videoProviderEnum(),
        storageKey: uploaded.assetId,
        playbackId: uploaded.playbackId,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        duration: uploaded.durationSec || null,
      },
    });

    const slug = uploaded.assetId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);

    const video = await this.prisma.video.create({
      data: {
        slug: `${slug}-${Date.now().toString(36)}`,
        title: title?.trim() || 'ვიდეო',
        mediaAssetId: asset.id,
        status: VideoStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      select: { id: true, title: true },
    });

    this.logger.log(`ვიდეო შეიქმნა: ${video.id} (${this.videos.name})`);
    return {
      videoId: video.id,
      assetId: asset.id,
      title: video.title,
      thumbnailUrl: uploaded.thumbnailUrl,
    };
  }

  /**
   * ჩატის დანართის ატვირთვა.
   *
   * `MediaSource.CHAT` განზრახ ცალკეა: ეს ფაილები კონფიდენციალურია და
   * მათზე წვდომა საუბრის მონაწილეობით უნდა შემოწმდეს, საჯარო ბმულით არა.
   */
  async uploadChatAttachment(file: Express.Multer.File, ownerId: string) {
    return this.uploadImage(file, ownerId, MediaSource.CHAT);
  }

  /** რბილი წაშლა — ფიზიკურად background-ით იშლება. */
  async softDelete(assetId: string): Promise<void> {
    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { status: MediaStatus.DELETED, deletedAt: new Date() },
    });
  }

  /** დაკვრის ბმული — ვადით, რომ გაზიარებით პაკეტს გვერდი არ აუარონ. */
  playbackUrl(playbackId: string, expiresInSec = 3600): Promise<string> {
    return this.videos.playbackUrl(playbackId, expiresInSec);
  }

  private videoProviderEnum(): StorageProvider {
    return this.videos.name === 'bunny'
      ? StorageProvider.BUNNY
      : StorageProvider.S3_CLOUDFRONT;
  }

  private fileProviderEnum(): StorageProvider {
    return this.files.name === 'r2' ? StorageProvider.R2 : StorageProvider.S3_CLOUDFRONT;
  }
}
