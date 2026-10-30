import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MediaSource,
  MediaStatus,
  MediaType,
  MediaVisibility,
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
 * პირდაპირი ატვირთვის ხელმოწერის ვადა.
 *
 * Bunny ერთ საათს მინიმუმად ურჩევს; 200MB ვიდეო სუსტ მობილურ
 * ინტერნეტზე უფრო დიდხანს იტვირთება. ბილეთი მხოლოდ ერთ კონკრეტულ
 * ჩანაწერზე მუშაობს, ამიტომ გაჟონვის შემთხვევაშიც ზიანი შეზღუდულია.
 */
const UPLOAD_TICKET_TTL_SEC = 6 * 60 * 60;

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
    visibility: MediaVisibility = MediaVisibility.PRIVATE,
  ) {
    const isPublic = visibility === MediaVisibility.PUBLIC;

    const stored = await this.files.upload({
      path: file.path,
      extension: extname(file.originalname).toLowerCase(),
      contentType: file.mimetype,
      folder: source.toLowerCase(),
      isPublic,
    });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerId,
        type: MediaType.IMAGE,
        source,
        visibility,
        status: MediaStatus.READY,
        provider: this.fileProviderEnum(),
        storageKey: stored.key,
        publicUrl: stored.url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      select: { id: true, publicUrl: true, storageKey: true },
    });

    // კერძო ფაილს მისამართი ბმულის მოთხოვნისას გამოაქვს
    const url = isPublic
      ? asset.publicUrl
      : await this.files.signedUrl(asset.storageKey, 900);

    return { assetId: asset.id, url, key: asset.storageKey };
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
   * ვიდეო ბრაუზერიდან პირდაპირი ატვირთვისთვის.
   *
   * ჩანაწერები ზუსტად ისევე იქმნება, როგორც `createVideoFromUpload`-ში —
   * webhook ასეტს `storageKey`-ით პოულობს და READY-ზე თავად გადაიყვანს,
   * სიახლეც მზადყოფნისას თავად გამოქვეყნდება. განსხვავება მხოლოდ ისაა,
   * რომ ბაიტებს ბრაუზერი აგზავნის და არა ჩვენი სერვერი.
   */
  async createVideoTicket(
    declared: { title?: string; mimeType: string; sizeBytes: number },
    ownerId: string,
  ) {
    const title = declared.title?.trim() || 'ვიდეო';
    const ticket = await this.videos.createUploadTicket(title, UPLOAD_TICKET_TTL_SEC);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerId,
        type: MediaType.VIDEO,
        source: MediaSource.ADMIN,
        // ფაილი ჯერ არც კი ატვირთულა — READY webhook-ით დადგება
        status: MediaStatus.PROCESSING,
        provider: this.videoProviderEnum(),
        storageKey: ticket.providerVideoId,
        playbackId: ticket.providerVideoId,
        mimeType: declared.mimeType,
        sizeBytes: declared.sizeBytes,
      },
    });

    const slug = ticket.providerVideoId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);

    // DRAFT და publishedAt-ის გარეშე: თუ ატვირთვა შუაში გაწყდა, მშობელი
    // ვიდეოთეკაში სამუდამოდ „მუშავდება"-ს არ დაინახავს. გამოქვეყნებას
    // webhook აკეთებს, როცა Bunny გადაშიფვრას დაასრულებს.
    const video = await this.prisma.video.create({
      data: {
        slug: `${slug}-${Date.now().toString(36)}`,
        title,
        mediaAssetId: asset.id,
        status: VideoStatus.DRAFT,
      },
      select: { id: true, title: true },
    });

    this.logger.log(`ატვირთვის ნებართვა: ვიდეო ${video.id}, Bunny ${ticket.providerVideoId}`);

    return {
      videoId: video.id,
      title: video.title,
      upload: ticket,
    };
  }

  /**
   * ჩატის დანართის ატვირთვა.
   *
   * `MediaSource.CHAT` განზრახ ცალკეა: ეს ფაილები კონფიდენციალურია და
   * მათზე წვდომა საუბრის მონაწილეობით უნდა შემოწმდეს, საჯარო ბმულით არა.
   */
  /**
   * ჩატის დანართი — ფოტო ან ვიდეო.
   *
   * ვიდეო პროვაიდერთან იტვირთება (გადაშიფვრა მას სჭირდება), ფოტო კი
   * პირდაპირ საცავში. ორივე კერძოა: ბავშვის ფოტო საჯარო ბმულით
   * არავის უნდა გაეხსნას.
   */
  async uploadChatAttachment(file: Express.Multer.File, ownerId: string) {
    if (!file.mimetype.startsWith('video/')) {
      return this.uploadImage(file, ownerId, MediaSource.CHAT, MediaVisibility.PRIVATE);
    }

    const uploaded = await this.videos.upload({
      path: file.path,
      title: 'ჩატის ვიდეო',
      contentType: file.mimetype,
    });

    return this.prisma.mediaAsset.create({
      data: {
        ownerId,
        type: MediaType.VIDEO,
        source: MediaSource.CHAT,
        visibility: MediaVisibility.PRIVATE,
        // გადაშიფვრა პროვაიდერთან გრძელდება — READY webhook-ით დადგება
        status: MediaStatus.PROCESSING,
        provider: this.videoProviderEnum(),
        storageKey: uploaded.assetId,
        playbackId: uploaded.playbackId,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        duration: uploaded.durationSec || null,
      },
    });
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
