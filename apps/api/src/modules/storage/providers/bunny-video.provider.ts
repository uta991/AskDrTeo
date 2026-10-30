import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { createReadStream, rmSync, statSync } from 'node:fs';
import { StorageNotFoundError } from '../storage.types';
import type {
  UploadVideoInput,
  UploadedVideo,
  VideoDetails,
  VideoStorageProvider,
  VideoUploadTicket,
} from '../storage.types';

/** Bunny-ს TUS endpoint — განახლებადი ატვირთვა პირდაპირ ბრაუზერიდან */
const TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';

interface BunnyVideo {
  guid: string;
  length: number;
  width?: number;
  height?: number;
  thumbnailFileName?: string;
  /** 3 = Finished, 4 = Resolution finished — ორივე დასრულებულად ითვლება */
  status?: number;
}

/** Bunny-ს სტატუსები, რომლებზეც ვიდეო დაკვრადია. */
const READY_STATUSES = [3, 4];

/**
 * Bunny Stream — ვიდეოს transcoding და ადაპტური დაკვრა.
 *
 * ჩვენს სერვერზე ვიდეოს შენახვას ორი პრობლემა ჰქონდა: მშობელი სუსტ
 * ინტერნეტზეც სრულ ხარისხს იტვირთავდა, და ტრაფიკის ხარჯი ვიდეოების
 * რაოდენობასთან ერთად სწრაფად იზრდებოდა. Bunny ორივეს წყვეტს —
 * თვითონ ამზადებს 360p–1080p ვარიანტებს და HLS-ით არიგებს.
 */
@Injectable()
export class BunnyVideoProvider implements VideoStorageProvider {
  readonly name = 'bunny';
  private readonly logger = new Logger(BunnyVideoProvider.name);

  private readonly libraryId: string;
  private readonly apiKey: string;
  private readonly cdnHost: string;
  private readonly tokenKey?: string;

  constructor(private readonly config: ConfigService) {
    this.libraryId = this.required('storage.bunny.libraryId');
    this.apiKey = this.required('storage.bunny.apiKey');
    this.cdnHost = this.required('storage.bunny.cdnHost').replace(/^https?:\/\//, '');
    this.tokenKey = this.config.get<string>('storage.bunny.tokenKey');
  }

  /**
   * ატვირთვა ორ ნაბიჯად: ჯერ იქმნება ჩანაწერი, მერე იტვირთება ფაილი.
   * Bunny-ს API სწორედ ასე მუშაობს — GUID წინასწარ გვჭირდება.
   */
  async upload(input: UploadVideoInput): Promise<UploadedVideo> {
    const created = await this.request<BunnyVideo>('videos', {
      method: 'POST',
      body: JSON.stringify({ title: input.title }),
      headers: { 'Content-Type': 'application/json' },
    });

    await this.request(`videos/${created.guid}`, {
      method: 'PUT',
      body: createReadStream(input.path) as unknown as BodyInit,
      headers: { 'Content-Length': String(statSync(input.path).size) },
      // stream-ის გაგზავნა duplex-ს მოითხოვს
      duplex: 'half',
    });

    rmSync(input.path, { force: true });
    this.logger.log(`Bunny ატვირთვა: ${created.guid}`);

    return {
      assetId: created.guid,
      playbackId: created.guid,
      // transcoding ჯერ მიმდინარეობს; thumbnail სტანდარტული სახელით ჩნდება
      thumbnailUrl: `https://${this.cdnHost}/${created.guid}/thumbnail.jpg`,
      durationSec: 0,
    };
  }

  /**
   * პირდაპირი ატვირთვის ნებართვა.
   *
   * ხელმოწერის ფორმულა Bunny-ს TUS დოკუმენტაციიდანაა:
   * sha256(libraryId + apiKey + expires + videoId), hex. გასაღები
   * ხელმოწერაშია ჩაშლილი და მისგან ვერ აღდგება — ბრაუზერს ის
   * არ სჭირდება.
   */
  async createUploadTicket(title: string, expiresInSec: number): Promise<VideoUploadTicket> {
    // არასწორი/ძველი გასაღები Bunny-სგან 401-ს იღებს — ადმინს „Internal
    // server error"-ის ნაცვლად ის უნდა დახვდეს, რისი გასწორებაც შეუძლია
    const created = await this.request<BunnyVideo>('videos', {
      method: 'POST',
      body: JSON.stringify({ title }),
      headers: { 'Content-Type': 'application/json' },
    }).catch((error: unknown) => {
      this.logger.error(`Bunny-ზე ჩანაწერი ვერ შეიქმნა: ${error}`);
      throw new ServiceUnavailableException(
        'ვიდეოს სერვისთან კავშირი ვერ დამყარდა — შეამოწმეთ Bunny-ს გასაღებები',
      );
    });

    const expires = Math.floor(Date.now() / 1000) + expiresInSec;
    const signature = createHash('sha256')
      .update(`${this.libraryId}${this.apiKey}${expires}${created.guid}`)
      .digest('hex');

    this.logger.log(`Bunny ატვირთვის ნებართვა: ${created.guid}`);

    return {
      endpoint: TUS_ENDPOINT,
      libraryId: this.libraryId,
      providerVideoId: created.guid,
      signature,
      expires,
    };
  }

  async remove(assetId: string): Promise<void> {
    await this.request(`videos/${assetId}`, { method: 'DELETE' });
  }

  async details(assetId: string): Promise<VideoDetails | null> {
    const video = await this.request<BunnyVideo>(`videos/${assetId}`).catch(() => null);
    if (!video) return null;

    return {
      durationSec: video.length ?? 0,
      width: video.width ?? null,
      height: video.height ?? null,
      thumbnailUrl: `https://${this.cdnHost}/${video.guid}/${video.thumbnailFileName ?? 'thumbnail.jpg'}`,
      ready: READY_STATUSES.includes(video.status ?? -1),
    };
  }

  /**
   * დაკვრის მისამართი.
   *
   * თუ ბიბლიოთეკაზე token authentication ჩართულია, ბმული ხელმოწერილია
   * და ვადა აქვს — გაზიარებული ბმულით პაკეტს ვერ აუვლიან გვერდს.
   */
  async playbackUrl(playbackId: string, expiresInSec: number): Promise<string> {
    const path = `/${playbackId}/playlist.m3u8`;

    if (!this.tokenKey) return `https://${this.cdnHost}${path}`;

    const expires = Math.floor(Date.now() / 1000) + expiresInSec;
    const token = createHash('sha256')
      .update(`${this.tokenKey}${path}${expires}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `https://${this.cdnHost}${path}?token=${token}&expires=${expires}`;
  }

  /** Bunny-ს მზა დამკვრელი — ბრაუზერს HLS-ის გაშიფვრა აღარ სჭირდება. */
  embedUrl(playbackId: string): string {
    return `https://iframe.mediadelivery.net/embed/${this.libraryId}/${playbackId}`;
  }

  private async request<T = unknown>(
    path: string,
    init: RequestInit & { duplex?: string } = {},
  ): Promise<T> {
    const res = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/${path}`, {
      ...init,
      headers: { AccessKey: this.apiKey, ...(init.headers ?? {}) },
    } as RequestInit);

    if (res.status === 404) {
      throw new StorageNotFoundError(path);
    }
    if (!res.ok) {
      throw new Error(`Bunny Stream: ${res.status} ${await res.text()}`);
    }

    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  private required(path: string): string {
    const value = this.config.get<string>(path);
    if (!value) {
      throw new Error(`Bunny კონფიგურაცია არასრულია: ${path} არ არის მითითებული`);
    }
    return value;
  }
}
