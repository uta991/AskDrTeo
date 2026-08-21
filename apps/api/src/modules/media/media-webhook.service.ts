import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaStatus, StorageProvider, VideoStatus } from '@prisma/client';
import { timingSafeEqual } from 'node:crypto';
import { NewsService } from '../news/news.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { VIDEO_STORAGE, type VideoStorageProvider } from '../storage/storage.types';

/**
 * Bunny Stream-ის webhook-ის ტვირთი.
 * https://docs.bunny.net/docs/stream-webhook
 */
export interface BunnyWebhookPayload {
  VideoLibraryId: number;
  VideoGuid: string;
  Status: number;
}

/** Bunny-ს სტატუსები. */
const STATUS = {
  QUEUED: 0,
  PROCESSING: 1,
  ENCODING: 2,
  FINISHED: 3,
  RESOLUTION_FINISHED: 4,
  FAILED: 5,
  UPLOAD_FAILED: 8,
} as const;

const READY_STATUSES: number[] = [STATUS.FINISHED, STATUS.RESOLUTION_FINISHED];
const FAILED_STATUSES: number[] = [STATUS.FAILED, STATUS.UPLOAD_FAILED];

/** სტატუსები, საიდანაც გამოსვლა აღარ ხდება. */
const TERMINAL: MediaStatus[] = [MediaStatus.READY, MediaStatus.FAILED, MediaStatus.DELETED];

@Injectable()
export class MediaWebhookService {
  private readonly logger = new Logger(MediaWebhookService.name);

  constructor(
    private readonly news: NewsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(VIDEO_STORAGE) private readonly videos: VideoStorageProvider,
  ) {}

  /**
   * საიდუმლოს შემოწმება.
   *
   * `timingSafeEqual` განზრახ — ჩვეულებრივი შედარება სიმბოლოების
   * რაოდენობით ამჟღავნებს, სად შეწყდა დამთხვევა და საიდუმლოს გამოცნობას
   * აადვილებს.
   */
  assertAuthentic(secret: string | undefined): void {
    const expected = this.config.get<string>('storage.bunny.webhookSecret');

    if (!expected) {
      throw new UnauthorizedException('webhook-ის საიდუმლო კონფიგურირებული არ არის');
    }

    const given = Buffer.from(secret ?? '');
    const want = Buffer.from(expected);

    if (given.length !== want.length || !timingSafeEqual(given, want)) {
      throw new UnauthorizedException('webhook-ის ხელმოწერა არასწორია');
    }
  }

  /**
   * მოვლენის დამუშავება.
   *
   * იდემპოტენტურია სამ დონეზე:
   *  1. `MediaProviderEvent` unique(provider, externalId) — ერთი და იგივე
   *     მოვლენა მეორედ ჩაწერას ვერ მოახერხებს;
   *  2. საბოლოო სტატუსში მყოფი asset აღარ იცვლება;
   *  3. ჩანაწერის შექმნის შეცდომა (რბოლა) წარმატებად ითვლება — ესე იგი
   *     მოვლენა უკვე დამუშავებულია.
   */
  async handleBunny(payload: BunnyWebhookPayload): Promise<{ status: string }> {
    const externalId = `${payload.VideoGuid}:${payload.Status}`;

    const asset = await this.prisma.mediaAsset.findFirst({
      where: { provider: StorageProvider.BUNNY, storageKey: payload.VideoGuid },
    });

    const event = await this.prisma.mediaProviderEvent
      .create({
        data: {
          assetId: asset?.id,
          provider: StorageProvider.BUNNY,
          externalId,
          eventType: `bunny.status.${payload.Status}`,
          payload: { ...payload },
        },
      })
      .catch(() => null);

    if (!event) {
      this.logger.log(`გამეორებული მოვლენა უგულებელყოფილია: ${externalId}`);
      return { status: 'duplicate' };
    }

    if (!asset) {
      // ვიდეო სხვა გარემოში აიტვირთა — ჟურნალში დარჩა, მოქმედება არ სჭირდება
      await this.markProcessed(event.id, 'უცნობი asset');
      return { status: 'unknown-asset' };
    }

    if (TERMINAL.includes(asset.status)) {
      await this.markProcessed(event.id);
      return { status: 'already-final' };
    }

    if (READY_STATUSES.includes(payload.Status)) {
      await this.markReady(asset.id, payload.VideoGuid);
      await this.markProcessed(event.id);
      return { status: 'ready' };
    }

    if (FAILED_STATUSES.includes(payload.Status)) {
      await this.markFailed(asset.id, `Bunny status ${payload.Status}`);
      await this.markProcessed(event.id);
      return { status: 'failed' };
    }

    // Queued/Processing/Encoding — მხოლოდ დროს ვნიშნავთ
    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { lastProviderEventAt: new Date() },
    });
    await this.markProcessed(event.id);

    return { status: 'in-progress' };
  }

  /**
   * READY — დეტალები პროვაიდერიდან წამოვიღეთ.
   *
   * webhook მხოლოდ სტატუსს შეიცავს; ხანგრძლივობა, გარჩევადობა და
   * thumbnail ცალკე მოთხოვნით მოდის.
   */
  private async markReady(assetId: string, providerAssetId: string): Promise<void> {
    const details = await this.videos.details(providerAssetId).catch(() => null);

    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.READY,
        duration: details?.durationSec || null,
        width: details?.width ?? null,
        height: details?.height ?? null,
        lastProviderEventAt: new Date(),
        failureReason: null,
      },
    });

    // ვიდეო ახლა დაკვრადია — thumbnail-იც ხელმისაწვდომია
    if (details?.thumbnailUrl) {
      await this.prisma.video.updateMany({
        where: { mediaAssetId: assetId },
        data: { previewUrl: details.thumbnailUrl },
      });
    }

    this.logger.log(`ვიდეო მზადაა: ${providerAssetId} (${details?.durationSec ?? 0} წმ)`);

    // ვიდეოს მოლოდინში მყოფი სიახლეები ახლა ქვეყნდება — ატვირთვისას
    // მშობელს შავი კადრი დახვდებოდა, სანამ გადაშიფვრა დასრულდებოდა
    const videos = await this.prisma.video.findMany({
      where: { mediaAssetId: assetId },
      select: { id: true },
    });

    for (const video of videos) {
      await this.news.publishWaitingFor(video.id).catch((error) => {
        this.logger.error(`სიახლეების გამოქვეყნება ჩავარდა: ${error}`);
      });
    }
  }

  private async markFailed(assetId: string, reason: string): Promise<void> {
    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.FAILED,
        failureReason: reason,
        lastProviderEventAt: new Date(),
      },
    });

    // ჩავარდნილი ვიდეო კატალოგში არ უნდა ჩანდეს
    await this.prisma.video.updateMany({
      where: { mediaAssetId: assetId },
      data: { status: VideoStatus.DRAFT },
    });

    this.logger.warn(`ვიდეო ჩავარდა: ${assetId} — ${reason}`);
  }

  private markProcessed(eventId: string, error?: string): Promise<unknown> {
    return this.prisma.mediaProviderEvent.update({
      where: { id: eventId },
      data: { processedAt: new Date(), error },
    });
  }
}
