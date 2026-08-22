import { Injectable } from '@nestjs/common';
import { NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

/** რამდენი შეტყობინება ჩამოიშლება — ზარის ჩამონაშალს მეტი არ სჭირდება. */
const FEED_LIMIT = 30;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ჩემი შეტყობინებები.
   *
   * მხოლოდ in-app არხი: push და SMS თავიანთი გზით მიდის და ზარში
   * მეორედ არ უნდა გაჩნდეს.
   */
  async feed(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, status: NotificationStatus.SENT },
        orderBy: { createdAt: 'desc' },
        take: FEED_LIMIT,
        select: {
          id: true,
          title: true,
          body: true,
          data: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.unreadCount(userId),
    ]);

    return { items, unread };
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, status: NotificationStatus.SENT, readAt: null },
    });
  }

  async markRead(id: string, userId: string) {
    // updateMany-ს იმიტომ ვიყენებთ, რომ სხვისი შეტყობინება არ შეიცვალოს
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { id, unread: await this.unreadCount(userId) };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { message: `წაკითხულად მოინიშნა ${result.count}`, unread: 0 };
  }

  /** ერთი შეტყობინების შექმნა — სხვა მოდულები ამით სარგებლობენ. */
  async push(input: {
    userId: string;
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        data: input.data,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }
}
