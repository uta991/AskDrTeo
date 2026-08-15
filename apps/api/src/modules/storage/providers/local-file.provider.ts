import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import type { FileStorageProvider, StoredFile, UploadFileInput } from '../storage.types';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');

/**
 * ლოკალური დისკი — მხოლოდ დეველოპმენტისთვის.
 *
 * პროდაქშენში არ გამოდგება: კონტეინერის გადატვირთვისას ფაილები ქრება.
 * იქ R2 ჩაირთვება, ეს კი ლოკალურ გაშვებას ინტერნეტისა და გასაღებების
 * გარეშე ინარჩუნებს.
 */
@Injectable()
export class LocalFileProvider implements FileStorageProvider {
  readonly name = 'local';
  private readonly logger = new Logger(LocalFileProvider.name);

  constructor(private readonly config: ConfigService) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  async upload(input: UploadFileInput): Promise<StoredFile> {
    const folder = join(UPLOAD_DIR, input.folder);
    mkdirSync(folder, { recursive: true });

    // ორიგინალი სახელი არ გამოიყენება — path traversal-ის რისკია
    const key = `${input.folder}/${randomBytes(16).toString('hex')}${input.extension}`;
    renameSync(input.path, join(UPLOAD_DIR, key));

    const base = this.config.get<string>('publicUrl', 'http://localhost:3000');
    this.logger.log(`ატვირთვა: ${key}`);

    return { url: `${base}/uploads/${key}`, key };
  }

  async remove(key: string): Promise<void> {
    rmSync(join(UPLOAD_DIR, key), { force: true });
  }
}
