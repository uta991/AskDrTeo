import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MediaSource,
  MediaVisibility,
  UserRole,
  type MediaAsset,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { FILE_STORAGE, type FileStorageProvider } from '../storage/storage.types';

/** ხელმოწერილი ბმულის ვადა — საკმარისი ჩატვირთვისთვის, მოკლე გაზიარებისთვის. */
const SIGNED_URL_TTL_SEC = 15 * 60;

export interface Viewer {
  id: string;
  role: UserRole;
}

/**
 * მედიაზე წვდომის კონტროლი.
 *
 * ხელმოწერილი ბმული მხოლოდ მაშინ გაიცემა, როცა უფლება უკვე შემოწმებულია.
 * ხელმოწერა თავისთავად უფლებას არ ამოწმებს — ვინც ბმულს მიიღებს, ვადის
 * ამოწურვამდე ნახავს. სწორედ ამიტომ არის ეს შემოწმება ცალკე ფენად.
 */
@Injectable()
export class MediaAccessService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly files: FileStorageProvider,
  ) {}

  /**
   * ერთი ფაილის ბმული.
   *
   * PUBLIC ფაილს ხელმოწერა არ სჭირდება — მისამართი ბაზაშივეა.
   */
  async urlFor(assetId: string, viewer: Viewer): Promise<string> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, deletedAt: null },
    });
    if (!asset) throw new NotFoundException('ფაილი ვერ მოიძებნა');

    if (asset.visibility === MediaVisibility.PUBLIC && asset.publicUrl) {
      return asset.publicUrl;
    }

    if (!(await this.canView(asset, viewer))) {
      throw new ForbiddenException('ამ ფაილზე წვდომა არ გაქვთ');
    }

    return this.files.signedUrl(asset.storageKey, SIGNED_URL_TTL_SEC);
  }

  /**
   * რამდენიმე ფაილის ბმული ერთდროულად.
   *
   * სიებისთვის აუცილებელია: ბავშვების ან შეტყობინებების სიაზე თითო
   * ფაილისთვის ცალკე მოთხოვნა ეკრანს შესამჩნევად ანელებდა. ხელმოწერა
   * ლოკალური ოპერაციაა, ამიტომ პარალელურად შესრულება იაფია.
   */
  async urlsFor(
    assetIds: string[],
    viewer: Viewer,
  ): Promise<Record<string, string>> {
    if (!assetIds.length) return {};

    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: [...new Set(assetIds)] }, deletedAt: null },
    });

    const allowed = await Promise.all(
      assets.map(async (asset) => ({
        asset,
        ok:
          (asset.visibility === MediaVisibility.PUBLIC && !!asset.publicUrl) ||
          (await this.canView(asset, viewer)),
      })),
    );

    const entries = await Promise.all(
      allowed
        .filter((row) => row.ok)
        .map(async ({ asset }) => {
          const url =
            asset.visibility === MediaVisibility.PUBLIC && asset.publicUrl
              ? asset.publicUrl
              : await this.files.signedUrl(asset.storageKey, SIGNED_URL_TTL_SEC);

          return [asset.id, url] as const;
        }),
    );

    // წვდომის გარეშე დარჩენილი ფაილები უბრალოდ არ ხვდება პასუხში —
    // შეცდომას არ ვაგდებთ, თორემ ერთი ფაილი მთელ სიას ჩააგდებდა
    return Object.fromEntries(entries);
  }

  /**
   * წვდომის წესები წყაროს მიხედვით.
   *
   * პერსონალს ყველაფერზე წვდომა აქვს — ოპერატორი ჩატში სწორედ ამ
   * ფაილებზე პასუხობს, ადმინი კი კონტენტს მართავს.
   */
  private async canView(asset: MediaAsset, viewer: Viewer): Promise<boolean> {
    if (viewer.role !== UserRole.PARENT) return true;
    if (asset.ownerId === viewer.id) return true;

    switch (asset.source) {
      case MediaSource.CHAT:
        return this.isConversationParticipant(asset.id, viewer.id);

      case MediaSource.ADMIN:
        // ადმინის კონტენტი ავტორიზებულ მომხმარებელს ეჩვენება;
        // პაკეტზე დამოკიდებულებას ვიდეოს ფენა ცალკე ამოწმებს
        return true;

      default:
        // PROFILE და OTHER — მხოლოდ მფლობელი
        return false;
    }
  }

  /** ჩატის ფაილი მხოლოდ იმ საუბრის მონაწილეს ეჩვენება, სადაც გაიგზავნა. */
  private async isConversationParticipant(
    assetId: string,
    userId: string,
  ): Promise<boolean> {
    const attachment = await this.prisma.messageAttachment.findFirst({
      where: {
        assetId,
        message: { conversation: { participants: { some: { userId } } } },
      },
      select: { id: true },
    });

    return !!attachment;
  }
}
