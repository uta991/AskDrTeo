/**
 * ფაილებისა და ვიდეოს საცავის კონტრაქტები.
 *
 * კოდი არასდროს იძახებს `uploadToR2()` ან `uploadToBunny()`. ის მხოლოდ
 * ამ ინტერფეისებს იცნობს, კონკრეტული პროვაიდერი კი `.env`-ით ირჩევა.
 * პროვაიდერის შეცვლა = ახალი adapter + ერთი ცვლადი, გამომძახებელი კოდი
 * ხელუხლებელი რჩება.
 */

export interface StoredFile {
  /** საჯარო მისამართი, რომელსაც კლიენტი იყენებს */
  url: string;
  /** პროვაიდერის შიდა იდენტიფიკატორი — წაშლისთვის */
  key: string;
}

export interface UploadFileInput {
  /** ლოკალური ფაილის გზა (multer-ის დროებითი ფაილი) */
  path: string;
  /** ორიგინალი გაფართოება, მაგ. ".jpg" */
  extension: string;
  contentType: string;
  /** ლოგიკური საქაღალდე: "avatars", "children" */
  folder: string;
}

/** ფოტოები, thumbnail-ები, ჩატის დანართები. */
export interface FileStorageProvider {
  readonly name: string;
  upload(input: UploadFileInput): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

export interface UploadedVideo {
  /** პროვაიდერის ვიდეოს ID — ბაზაში `providerAssetId`-ად ინახება */
  assetId: string;
  /** დასაკრავი იდენტიფიკატორი ან HLS მისამართი */
  playbackId: string;
  thumbnailUrl: string | null;
  durationSec: number;
}

export interface UploadVideoInput {
  path: string;
  title: string;
  contentType: string;
}

/**
 * ვიდეო.
 *
 * ცალკე ინტერფეისია ფაილებისგან განზრახ: ვიდეოს transcoding, ადაპტური
 * ხარისხი და დაცული დაკვრა სჭირდება — ეს ჩვეულებრივი ფაილის საცავს
 * არ აქვს და არც უნდა ჰქონდეს.
 */
export interface VideoStorageProvider {
  readonly name: string;
  upload(input: UploadVideoInput): Promise<UploadedVideo>;
  remove(assetId: string): Promise<void>;
  /**
   * დაცული დაკვრის მისამართი.
   * ხელმოწერილი ბმული ვადით — რომ ბმულის გაზიარებით პაკეტს არ გვერდი
   * აუარონ.
   */
  playbackUrl(playbackId: string, expiresInSec: number): Promise<string>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
export const VIDEO_STORAGE = Symbol('VIDEO_STORAGE');
