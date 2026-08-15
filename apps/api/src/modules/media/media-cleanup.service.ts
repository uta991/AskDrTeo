import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MediaAsset, MediaType, StorageProvider } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  FILE_STORAGE,
  StorageNotFoundError,
  VIDEO_STORAGE,
  type FileStorageProvider,
  type VideoStorageProvider,
} from '../storage/storage.types';

/**
 * რამდენ ხანს რჩება ფაილი წაშლის შემდეგ.
 *
 * შეცდომით წაშლის შემთხვევაში აღდგენის ფანჯარაა — ამ დროში ჩანაწერსაც
 * და ფაილსაც ვინახავთ.
 */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/** ერთ გაშვებაზე დასამუშავებელი მაქსიმუმი. */
const BATCH_SIZE = 50;

/**
 * პარალელური მოთხოვნების ზღვარი.
 *
 * ასობით ერთდროული მოთხოვნა პროვაიდერის rate limit-ს დაარტყამდა და
 * ჩვენს პროცესსაც დატვირთავდა.
 */
const CONCURRENCY = 5;

/** ხელახალი მცდელობის ინტერვალები — მზარდი დაყოვნებით. */
const BACKOFF_MS = [
  5 * 60 * 1000, // 5 წუთი
  30 * 60 * 1000, // 30 წუთი
  2 * 60 * 60 * 1000, // 2 საათი
  12 * 60 * 60 * 1000, // 12 საათი
];

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly files: FileStorageProvider,
    @Inject(VIDEO_STORAGE) private readonly videos: VideoStorageProvider,
  ) {}

  /**
   * პერიოდული გაწმენდა.
   *
   * `running` დროშა იცავს გადაფარვისგან: ნელი გაშვება რომ არ დასრულებულა,
   * შემდეგი არ უნდა დაიწყოს და იმავე ჩანაწერებზე არ იმუშაოს.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduled(): Promise<void> {
    if (this.running) {
      this.logger.debug('წინა გაშვება ჯერ მიმდინარეობს — გამოტოვებულია');
      return;
    }

    this.running = true;
    try {
      const result = await this.purgeBatch();
      if (result.processed) {
        this.logger.log(
          `გაწმენდა: ${result.purged} წაიშალა, ${result.failed} ჩავარდა`,
        );
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * ერთი პარტიის დამუშავება.
   *
   * ერთი ფაილის ჩავარდნა დანარჩენებს არ აჩერებს — თითოეული ცალკე
   * მუშავდება და შეცდომა მხოლოდ თავის ჩანაწერს ეხება.
   */
  async purgeBatch(): Promise<{ processed: number; purged: number; failed: number }> {
    const now = new Date();

    const candidates = await this.prisma.mediaAsset.findMany({
      where: {
        deletedAt: { lt: new Date(now.getTime() - GRACE_PERIOD_MS) },
        purgedAt: null,
        OR: [{ purgeNextRetryAt: null }, { purgeNextRetryAt: { lte: now } }],
      },
      orderBy: { deletedAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (!candidates.length) return { processed: 0, purged: 0, failed: 0 };

    let purged = 0;
    let failed = 0;

    for (const chunk of this.chunks(candidates, CONCURRENCY)) {
      const results = await Promise.all(chunk.map((asset) => this.purgeOne(asset)));
      purged += results.filter(Boolean).length;
      failed += results.filter((ok) => !ok).length;
    }

    return { processed: candidates.length, purged, failed };
  }

  /** ერთი ფაილის წაშლა პროვაიდერიდან. */
  private async purgeOne(asset: MediaAsset): Promise<boolean> {
    try {
      await this.removeFromProvider(asset);

      // ჩანაწერი ბაზაში რჩება — მხოლოდ ფაილი წაიშალა
      await this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          purgedAt: new Date(),
          purgeLastError: null,
          purgeNextRetryAt: null,
        },
      });

      return true;
    } catch (error) {
      // პროვაიდერთან უკვე აღარ არსებობს — შედეგი იგივეა, წარმატებაა
      if (error instanceof StorageNotFoundError) {
        await this.prisma.mediaAsset.update({
          where: { id: asset.id },
          data: {
            purgedAt: new Date(),
            purgeLastError: 'უკვე აღარ არსებობდა',
            purgeNextRetryAt: null,
          },
        });
        return true;
      }

      await this.scheduleRetry(asset, error);
      return false;
    }
  }

  private removeFromProvider(asset: MediaAsset): Promise<void> {
    if (asset.provider === StorageProvider.BUNNY || asset.type === MediaType.VIDEO) {
      return this.videos.remove(asset.storageKey);
    }
    return this.files.remove(asset.storageKey);
  }

  /**
   * ხელახალი მცდელობის დაგეგმვა.
   *
   * ბოლო ინტერვალის ამოწურვის შემდეგ 12 საათი რჩება — ჩანაწერი რიგში
   * სამუდამოდ არ იკარგება, მაგრამ პროვაიდერს ხშირად აღარ ვაწუხებთ.
   */
  private async scheduleRetry(asset: MediaAsset, error: unknown): Promise<void> {
    const attempts = asset.purgeAttempts + 1;
    const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];
    const message = error instanceof Error ? error.message : String(error);

    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        purgeAttempts: attempts,
        purgeNextRetryAt: new Date(Date.now() + delay),
        purgeLastError: message.slice(0, 500),
      },
    });

    this.logger.warn(
      `გაწმენდა ჩავარდა (${attempts}) ${asset.storageKey}: ${message}. ` +
        `შემდეგი მცდელობა ${Math.round(delay / 60000)} წუთში`,
    );
  }

  private *chunks<T>(items: T[], size: number): Generator<T[]> {
    for (let i = 0; i < items.length; i += size) {
      yield items.slice(i, i + size);
    }
  }
}
