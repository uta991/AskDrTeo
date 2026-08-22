import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  MediaStatus,
  Prisma,
  UserRole,
  VideoAccessType,
  VideoStatus,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { VIDEO_STORAGE, type VideoStorageProvider } from '../storage/storage.types';
import { UpdateVideoDto } from './dto/video.dto';

const STAFF_ROLES: UserRole[] = [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN];

const VIDEO_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  accessType: true,
  ageMinMonths: true,
  ageMaxMonths: true,
  isFeatured: true,
  viewCount: true,
  publishedAt: true,
  category: { select: { id: true, slug: true, name: true } },
  mediaAsset: { select: { playbackId: true, duration: true, status: true } },
  thumbnailAsset: { select: { publicUrl: true } },
} satisfies Prisma.VideoSelect;

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
    @Inject(VIDEO_STORAGE) private readonly videos: VideoStorageProvider,
  ) {}

  /**
   * ბიბლიოთეკა მნახველის უფლებით.
   *
   * `video_library` ორ მნიშვნელობას იღებს: `free_only` — მხოლოდ უფასო
   * ვიდეოები, `all` — სრული. დახურული ვიდეო სიიდან არ ქრება: სათაური
   * ჩანს, დაკვრა კი არა — თორემ მშობელი ვერ გაიგებდა, რას იძენს.
   */
  async list(userId: string, role: UserRole, categorySlug?: string) {
    const scope = await this.scopeFor(userId, role);

    const videos = await this.prisma.video.findMany({
      where: {
        status: VideoStatus.PUBLISHED,
        deletedAt: null,
        category: categorySlug ? { slug: categorySlug } : undefined,
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }],
      take: 100,
      select: VIDEO_SELECT,
    });

    return videos.map((video) => this.present(video, scope));
  }

  async categories() {
    return this.prisma.videoCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, name: true, description: true },
    });
  }

  async findOne(slug: string, userId: string, role: UserRole) {
    const video = await this.prisma.video.findFirst({
      where: { slug, deletedAt: null, status: VideoStatus.PUBLISHED },
      select: VIDEO_SELECT,
    });
    if (!video) throw new NotFoundException('ვიდეო ვერ მოიძებნა');

    const scope = await this.scopeFor(userId, role);
    const presented = this.present(video, scope);

    if (!presented.unlocked) {
      throw new ForbiddenException({
        message: 'ეს ვიდეო თქვენს პაკეტში არ შედის',
        requiredFeature: 'video_library',
        upgradeRequired: true,
      });
    }

    // ნახვის აღრიცხვა — რომელი თემა აინტერესებთ, კონტენტის გეგმას კვებავს
    await this.prisma.video.update({
      where: { id: video.id },
      data: { viewCount: { increment: 1 } },
    });

    await this.prisma.videoView.create({
      data: { videoId: video.id, userId },
    });

    return presented;
  }

  /** ყურების პროგრესი — სად შეწყვიტა, საიდან განაგრძოს. */
  async saveProgress(videoId: string, positionSec: number, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, deletedAt: null },
      select: { id: true, mediaAsset: { select: { duration: true } } },
    });
    if (!video) throw new NotFoundException('ვიდეო ვერ მოიძებნა');

    const duration = video.mediaAsset?.duration ?? 0;
    // 90%-ზე ნანახად ითვლება — ბოლო წამებამდე მაყურებელი იშვიათად აღწევს
    const percent = duration > 0 ? Math.min(100, Math.round((positionSec / duration) * 100)) : 0;
    const isCompleted = percent >= 90;

    return this.prisma.watchProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: { positionSec, percent, isCompleted, lastWatchedAt: new Date() },
      create: { userId, videoId, positionSec, percent, isCompleted, lastWatchedAt: new Date() },
    });
  }

  // ── ადმინის მხარე ────────────────────────────────────────────────

  listAll() {
    return this.prisma.video.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { ...VIDEO_SELECT, status: true, createdAt: true },
    });
  }

  async update(id: string, dto: UpdateVideoDto, actorId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!video) throw new NotFoundException('ვიდეო ვერ მოიძებნა');

    const updated = await this.prisma.video.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        categoryId: dto.categoryId,
        accessType: dto.accessType,
        ageMinMonths: dto.ageMinMonths,
        ageMaxMonths: dto.ageMaxMonths,
        isFeatured: dto.isFeatured,
        status: dto.status,
        publishedAt:
          dto.status === VideoStatus.PUBLISHED ? new Date() : undefined,
      },
      select: VIDEO_SELECT,
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'Video',
      entityId: id,
      description: `ვიდეო განახლდა: ${updated.title}`,
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!video) throw new NotFoundException('ვიდეო ვერ მოიძებნა');

    await this.prisma.video.update({
      where: { id },
      data: { deletedAt: new Date(), status: VideoStatus.ARCHIVED },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'Video',
      entityId: id,
      description: `ვიდეო წაიშალა: ${video.title}`,
    });

    return { message: 'ვიდეო წაშლილია', id };
  }

  /** მნახველის წვდომის დიაპაზონი — ერთხელ ითვლება, სიაზე ერთი მოთხოვნა. */
  private async scopeFor(userId: string, role: UserRole): Promise<'all' | 'free_only'> {
    if (STAFF_ROLES.includes(role)) return 'all';

    const snapshot = await this.entitlements.resolve(userId);
    return snapshot.features.video_library?.value === 'all' ? 'all' : 'free_only';
  }

  /** ერთი ვიდეო მნახველისთვის — დაკვრადი ბმული მხოლოდ ღია ვიდეოზე. */
  private present(video: Prisma.VideoGetPayload<{ select: typeof VIDEO_SELECT }>, scope: 'all' | 'free_only') {
    const ready = video.mediaAsset?.status === MediaStatus.READY;
    const free = video.accessType === VideoAccessType.FREE;
    const unlocked = scope === 'all' || free;

    return {
      id: video.id,
      slug: video.slug,
      title: video.title,
      description: video.description,
      category: video.category,
      durationSec: video.mediaAsset?.duration ?? null,
      thumbnailUrl: video.thumbnailAsset?.publicUrl ?? null,
      ageMinMonths: video.ageMinMonths,
      ageMaxMonths: video.ageMaxMonths,
      isFeatured: video.isFeatured,
      viewCount: video.viewCount,
      free,
      unlocked,
      processing: !!video.mediaAsset && !ready,
      embedUrl:
        unlocked && ready && video.mediaAsset?.playbackId
          ? this.videos.embedUrl(video.mediaAsset.playbackId)
          : null,
    };
  }
}
