import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  NewsStatus,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';

const NEWS_INCLUDE = {
  video: {
    select: {
      id: true,
      title: true,
      // ფაილის მისამართები MediaAsset-შია — Video მხოლოდ ბიზნეს-ინფორმაციაა
      mediaAsset: { select: { playbackId: true, duration: true, status: true } },
      thumbnailAsset: { select: { publicUrl: true } },
    },
  },
  author: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.NewsPostInclude;

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── მშობლისთვის ─────────────────────────────────────────────────────

  /** გამოქვეყნებული სიახლეები — მთავარი ეკრანის ლენტი. */
  async listPublished(limit = 20) {
    const now = new Date();

    const posts = await this.prisma.newsPost.findMany({
      where: {
        status: NewsStatus.PUBLISHED,
        deletedAt: null,
        // ჩვენების ფანჯარა: ცარიელი საზღვარი შეზღუდვას არ ნიშნავს
        AND: [
          { OR: [{ visibleFrom: null }, { visibleFrom: { lte: now } }] },
          { OR: [{ visibleUntil: null }, { visibleUntil: { gte: now } }] },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: NEWS_INCLUDE,
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      body: post.body,
      coverUrl: post.coverUrl,
      video: post.video,
      publishedAt: post.publishedAt,
    }));
  }

  // ─── ადმინისთვის ─────────────────────────────────────────────────────

  listAll(page = 1, perPage = 20) {
    return this.prisma.newsPost.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: NEWS_INCLUDE,
    });
  }

  async create(dto: CreateNewsDto, actorId: string, actorRole: UserRole) {
    // ოპერატორი მხოლოდ ტექსტს აგზავნის — ვიდეო და ქავერი კონტენტის
    // მართვაა, რაც ადმინის უფლებაა
    if (actorRole === UserRole.OPERATOR && (dto.videoId || dto.coverUrl)) {
      throw new ForbiddenException('ვიდეოს ან ქავერის მიბმა ოპერატორს არ შეუძლია');
    }

    const post = await this.prisma.newsPost.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        coverUrl: dto.coverUrl,
        videoId: dto.videoId,
        notify: dto.notify ?? true,
        visibleFrom: dto.visibleFrom,
        visibleUntil: dto.visibleUntil,
        authorId: actorId,
      },
      include: NEWS_INCLUDE,
    });

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'NewsPost',
      entityId: post.id,
      after: { title: post.title },
      description: `სიახლე შეიქმნა: ${post.title}`,
    });

    // publishNow — ერთი ნაბიჯით შექმნა და გამოქვეყნება
    return dto.publishNow ? this.publish(post.id, actorId) : post;
  }

  async update(id: string, dto: UpdateNewsDto, actorId: string) {
    const before = await this.findOne(id);

    const post = await this.prisma.newsPost.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        body: dto.body?.trim(),
        coverUrl: dto.coverUrl,
        videoId: dto.videoId,
        notify: dto.notify,
        visibleFrom: dto.visibleFrom,
        visibleUntil: dto.visibleUntil,
      },
      include: NEWS_INCLUDE,
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'NewsPost',
      entityId: id,
      before: { title: before.title },
      after: { title: post.title },
    });

    return post;
  }

  /**
   * გამოქვეყნება და შეტყობინებების დაგზავნა.
   *
   * შეტყობინებები მხოლოდ პირველ გამოქვეყნებაზე იგზავნება — ხელახალი
   * გამოქვეყნება მომხმარებლებს იმავე ტექსტს მეორედ არ მიაწვდის.
   */
  async publish(id: string, actorId: string) {
    const post = await this.findOne(id);
    const firstPublish = !post.publishedAt;

    const updated = await this.prisma.newsPost.update({
      where: { id },
      data: { status: NewsStatus.PUBLISHED, publishedAt: post.publishedAt ?? new Date() },
      include: NEWS_INCLUDE,
    });

    let notified = post.notifiedCount;
    if (firstPublish && post.notify) {
      notified = await this.fanOutNotifications(updated.id, updated.title, updated.body);
      await this.prisma.newsPost.update({
        where: { id },
        data: { notifiedCount: notified },
      });
    }

    await this.audit.record({
      actorId,
      action: AuditAction.PUBLISH,
      entityType: 'NewsPost',
      entityId: id,
      description: `გამოქვეყნდა: ${updated.title} (შეტყობინება: ${notified})`,
    });

    return { ...updated, notifiedCount: notified };
  }

  /**
   * სიახლის წაშლა.
   *
   * რბილია: `deletedAt` ინიშნება და ლენტიდან ქრება, ჩანაწერი კი რჩება —
   * შეტყობინება უკვე გაგზავნილია და ვინ რა გამოაქვეყნა, უნდა ჩანდეს.
   */
  async remove(id: string, actorId: string) {
    const post = await this.prisma.newsPost.findFirst({
      where: { id, deletedAt: null },
    });
    if (!post) throw new NotFoundException('სიახლე ვერ მოიძებნა');

    await this.prisma.newsPost.update({
      where: { id },
      data: { deletedAt: new Date(), status: NewsStatus.ARCHIVED },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'NewsPost',
      entityId: id,
      before: { title: post.title, status: post.status },
      description: `სიახლე წაშლილია: ${post.title}`,
    });

    return { message: 'სიახლე წაშლილია', id };
  }

  async archive(id: string, actorId: string) {
    await this.findOne(id);

    const post = await this.prisma.newsPost.update({
      where: { id },
      data: { status: NewsStatus.ARCHIVED },
      include: NEWS_INCLUDE,
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'NewsPost',
      entityId: id,
      description: `არქივში: ${post.title}`,
    });

    return post;
  }

  private async findOne(id: string) {
    const post = await this.prisma.newsPost.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('სიახლე ვერ მოიძებნა');
    return post;
  }

  /**
   * in-app შეტყობინება ყველა აქტიურ მშობელს.
   *
   * `createMany` ერთი მოთხოვნით ჩაწერს — ციკლში შექმნა ათასობით
   * მომხმარებელზე ბაზას გადატვირთავდა.
   */
  private async fanOutNotifications(
    postId: string,
    title: string,
    body: string,
  ): Promise<number> {
    const parents = await this.prisma.user.findMany({
      where: { role: UserRole.PARENT, status: UserStatus.ACTIVE, deletedAt: null },
      select: { id: true },
    });

    if (!parents.length) return 0;

    const preview = body.length > 140 ? `${body.slice(0, 137)}...` : body;

    await this.prisma.notification.createMany({
      data: parents.map((parent) => ({
        userId: parent.id,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title,
        body: preview,
        data: { screen: 'News', postId },
        templateKey: 'news_published',
        sentAt: new Date(),
      })),
    });

    this.logger.log(`სიახლე ${postId}: ${parents.length} შეტყობინება`);
    return parents.length;
  }
}
