import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, rmSync, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import type { FileStorageProvider, StoredFile, UploadFileInput } from '../storage.types';

/**
 * Cloudflare R2 — ფოტოები, thumbnail-ები, დანართები.
 *
 * S3-თავსებადია, ამიტომ სტანდარტულ AWS SDK-ს ვიყენებთ. თუ ოდესმე S3-ზე
 * ან სხვა თავსებად საცავზე გადავალთ, მხოლოდ endpoint იცვლება.
 *
 * მთავარი უპირატესობა: ინტერნეტში გაცემა (egress) უფასოა — ავატარებზე
 * და thumbnail-ებზე სწორედ ეს ხარჯი იქნებოდა ყველაზე დიდი.
 */
@Injectable()
export class R2FileProvider implements FileStorageProvider {
  readonly name = 'r2';
  private readonly logger = new Logger(R2FileProvider.name);

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.required('storage.r2.accountId');
    this.bucket = this.required('storage.r2.bucket');
    this.publicBase = this.required('storage.r2.publicUrl').replace(/\/$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.required('storage.r2.accessKeyId'),
        secretAccessKey: this.required('storage.r2.secretAccessKey'),
      },
    });
  }

  async upload(input: UploadFileInput): Promise<StoredFile> {
    const key = `${input.folder}/${randomBytes(16).toString('hex')}${input.extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: createReadStream(input.path),
        // ContentLength აუცილებელია — stream-ს ზომა თავისით არ აქვს
        ContentLength: statSync(input.path).size,
        ContentType: input.contentType,
        // ავატარები იშვიათად იცვლება; ბრაუზერს ხანგრძლივად ვაქეშინებთ
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    // multer-ის დროებითი ფაილი აღარ გვჭირდება
    rmSync(input.path, { force: true });

    this.logger.log(`R2 ატვირთვა: ${key}`);

    // bucket კერძოა — საჯარო მისამართი მხოლოდ ცალსახად მონიშნულ ფაილს აქვს
    return { url: input.isPublic ? `${this.publicBase}/${key}` : null, key };
  }

  async signedUrl(key: string, expiresInSec: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSec },
    );
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private required(path: string): string {
    const value = this.config.get<string>(path);
    if (!value) {
      throw new Error(`R2 კონფიგურაცია არასრულია: ${path} არ არის მითითებული`);
    }
    return value;
  }
}
