import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MediaType, UserRole } from '@prisma/client';
import { openSync, readSync, closeSync, rmSync, statSync } from 'node:fs';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PermissionsService } from '../permissions/permissions.service';
import type { PermissionKey } from '../permissions/permission-catalog';

/** ატვირთვის კატეგორია — თითოეულს ცალკე ლიმიტი და დასაშვები ტიპები აქვს. */
export type UploadKind = 'image' | 'video' | 'document';

interface KindRules {
  feature: string;
  /** სისტემური ნაგულისხმევი — თუ პაკეტს ლიმიტი მითითებული არ აქვს */
  defaultMb: number;
  /** მკაცრი ჭერი: პაკეტიც კი ვერ გადააჭარბებს */
  hardCapMb: number;
  mediaType: MediaType;
  /** დასაშვები MIME ტიპები — გაფართოებას არ ვენდობით */
  allowedMime: string[];
  /** საჭირო უფლება; undefined — ყველა ავტორიზებულს შეუძლია */
  permission?: PermissionKey;
}

/**
 * ლიმიტები და დასაშვები ტიპები კატეგორიების მიხედვით.
 *
 * ერთი საერთო `max_upload_mb` არ გამოგვადგებოდა: 5MB ფოტოსთვის
 * გონივრულია, ვიდეოსთვის — უაზრო.
 */
const RULES: Record<UploadKind, KindRules> = {
  image: {
    feature: 'max_upload_mb_image',
    defaultMb: 5,
    hardCapMb: 25,
    mediaType: MediaType.IMAGE,
    allowedMime: ['image/jpeg', 'image/png', 'image/webp'],
  },
  video: {
    feature: 'max_upload_mb_video',
    defaultMb: 200,
    hardCapMb: 2048,
    mediaType: MediaType.VIDEO,
    allowedMime: ['video/mp4', 'video/quicktime'],
    permission: 'video.create',
  },
  document: {
    feature: 'max_upload_mb_document',
    defaultMb: 10,
    hardCapMb: 100,
    mediaType: MediaType.FILE,
    allowedMime: ['application/pdf'],
  },
};

/** ფაილის ხელმოწერები — პირველი ბაიტები ცალსახად განსაზღვრავს ფორმატს. */
const SIGNATURES: { mime: string; offset: number; bytes: number[] }[] = [
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WEBP: "RIFF" + 4 ბაიტი ზომა + "WEBP"
  { mime: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  // MP4/MOV: ოთხი ბაიტი ზომა + "ftyp"
  { mime: 'video/mp4', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
];

const MB = 1024 * 1024;

export interface UploadActor {
  id: string;
  role: UserRole;
}

/**
 * ატვირთვის წესები — ოთხი შემოწმება თანმიმდევრობით:
 *
 *   1. უფლება      — შეუძლია თუ არა ამ როლს ამ ტიპის ატვირთვა
 *   2. ლიმიტი      — პაკეტის ფუნქციიდან, სისტემური default-ით
 *   3. MIME        — ფაილის რეალური შიგთავსით, არა გაფართოებით
 *   4. ზომა        — დისკზე ჩაწერილი ფაილიდან, არა Content-Length-იდან
 *
 * ბოლო ორი განზრახ ფაილის ჩაწერის შემდეგაა: კლიენტს header-ის
 * გაყალბება შეუძლია, დისკზე ჩაწერილი ბაიტების გაყალბება — არა.
 */
@Injectable()
export class UploadPolicyService {
  private readonly logger = new Logger(UploadPolicyService.name);

  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly permissions: PermissionsService,
  ) {}

  /** ყველაზე დიდი შესაძლო ზომა — multer-ის სტატიკური ჭერისთვის. */
  static maxBytesFor(kind: UploadKind): number {
    return RULES[kind].hardCapMb * MB;
  }

  static mediaTypeFor(kind: UploadKind): MediaType {
    return RULES[kind].mediaType;
  }

  /**
   * შემოწმება. ჩავარდნისას ფაილი დისკიდან იშლება — თორემ უარყოფილი
   * ატვირთვები დროებით საქაღალდეს ავსებდა.
   */
  async assertAllowed(
    file: Express.Multer.File,
    kind: UploadKind,
    actor: UploadActor,
  ): Promise<void> {
    const rules = RULES[kind];

    try {
      await this.assertPermission(rules, actor);
      const limitMb = await this.resolveLimitMb(rules, actor);
      this.assertMime(file, rules);
      this.assertSize(file, limitMb);
    } catch (error) {
      rmSync(file.path, { force: true });
      throw error;
    }
  }

  /**
   * 1. უფლება.
   *
   * როლი აქ აღარ ფიგურირებს — რომელ როლს შეუძლია ვიდეოს ატვირთვა,
   * ბაზაში წყდება და Super Admin-ს პანელიდან იცვლება.
   */
  private async assertPermission(rules: KindRules, actor: UploadActor): Promise<void> {
    if (!rules.permission) return;
    await this.permissions.assert(actor.id, rules.permission);
  }

  /**
   * 2. ლიმიტი პაკეტიდან.
   *
   * თუ პაკეტს მითითებული არ აქვს — სისტემური default, არა ულიმიტო.
   * ულიმიტო მხოლოდ ცალსახად "unlimited" მნიშვნელობით მიიღება, და
   * მაშინაც მკაცრ ჭერს ექვემდებარება.
   */
  private async resolveLimitMb(rules: KindRules, actor: UploadActor): Promise<number> {
    // პერსონალს პაკეტი არ აქვს — მკაცრი ჭერით სარგებლობს
    if (actor.role !== UserRole.PARENT) return rules.hardCapMb;

    const fromPlan = await this.entitlements.limit(actor.id, rules.feature);

    // null = "unlimited" ან ფუნქცია პაკეტში არ არის — ორივე შემთხვევა
    // ცალკე უნდა გაირჩეს
    if (fromPlan === null) {
      const snapshot = await this.entitlements.resolve(actor.id);
      const value = snapshot.features[rules.feature]?.value;

      return value === 'unlimited' ? rules.hardCapMb : rules.defaultMb;
    }

    return Math.min(fromPlan, rules.hardCapMb);
  }

  /** 3. MIME — ფაილის პირველი ბაიტებით. */
  private assertMime(file: Express.Multer.File, rules: KindRules): void {
    const detected = this.sniffMime(file.path);

    if (!detected || !rules.allowedMime.includes(detected)) {
      throw new BadRequestException(
        `დაუშვებელი ფაილის ტიპი. დასაშვებია: ${rules.allowedMime.join(', ')}`,
      );
    }

    // გამოცხადებული და რეალური ტიპი უნდა ემთხვეოდეს — შეუსაბამობა
    // ან შეცდომაა, ან განზრახ შენიღბვის მცდელობა
    if (file.mimetype !== detected && !this.isEquivalent(file.mimetype, detected)) {
      this.logger.warn(`MIME შეუსაბამობა: გამოცხადდა ${file.mimetype}, არის ${detected}`);
    }
  }

  /** 4. ზომა — დისკზე ჩაწერილი ფაილიდან. */
  private assertSize(file: Express.Multer.File, limitMb: number): void {
    const actualBytes = statSync(file.path).size;

    if (actualBytes > limitMb * MB) {
      throw new BadRequestException(`ფაილი დიდია. მაქსიმუმი: ${limitMb} MB`);
    }

    if (actualBytes === 0) {
      throw new BadRequestException('ფაილი ცარიელია');
    }
  }

  /** პირველი ბაიტების წაკითხვა და ხელმოწერასთან შედარება. */
  private sniffMime(path: string): string | null {
    const header = Buffer.alloc(16);
    const fd = openSync(path, 'r');

    try {
      readSync(fd, header, 0, header.length, 0);
    } finally {
      closeSync(fd);
    }

    return (
      SIGNATURES.find(({ offset, bytes }) =>
        bytes.every((byte, i) => header[offset + i] === byte),
      )?.mime ?? null
    );
  }

  /** MOV და MP4 ერთსა და იმავე კონტეინერს იყენებენ. */
  private isEquivalent(declared: string, detected: string): boolean {
    const video = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
    return video.includes(declared) && video.includes(detected);
  }
}
