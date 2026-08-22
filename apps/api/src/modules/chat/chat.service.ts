import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ConversationStatus,
  MessageType,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { SmsService } from '../sms/sms.service';
import { RateConversationDto, SendMessageDto, StartConversationDto } from './dto/chat.dto';

const STAFF_ROLES: UserRole[] = [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN];

/** დახურულ საუბარში წერა აღარ შეიძლება — ახალი უნდა გაიხსნას. */
const WRITABLE: ConversationStatus[] = [ConversationStatus.OPEN, ConversationStatus.ASSIGNED];

const MESSAGE_SELECT = {
  id: true,
  body: true,
  type: true,
  createdAt: true,
  senderId: true,
  sender: { select: { id: true, firstName: true, lastName: true, role: true } },
} satisfies Prisma.MessageSelect;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * მშობლის საუბრები.
   *
   * ერთზე მეტი შეიძლება იყოს: ძველი დახურული და ახალი მიმდინარე.
   */
  async listForParent(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
      include: {
        participants: { where: { userId }, select: { lastReadAt: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true },
        },
      },
    });

    return Promise.all(
      conversations.map(async (conversation) => ({
        id: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        lastMessageAt: conversation.lastMessageAt,
        lastMessage: conversation.messages[0]?.body ?? null,
        unread: await this.unreadCount(conversation.id, conversation.participants[0]?.lastReadAt),
      })),
    );
  }

  /**
   * ოპერატორის რიგი.
   *
   * `chat_priority`-ის მქონე მშობელი წინ დგება. ეს პაკეტის დაპირებაა
   * და არა თავაზიანობა — რიგის წესი კოდში ერთ ადგილას უნდა იყოს.
   */
  async queue(status?: ConversationStatus) {
    const conversations = await this.prisma.conversation.findMany({
      where: status ? { status } : { status: { not: ConversationStatus.CLOSED } },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        participants: {
          select: {
            lastReadAt: true,
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true },
        },
      },
    });

    const rows = await Promise.all(
      conversations.map(async (conversation) => {
        const parent = conversation.participants.find((p) => p.user.role === UserRole.PARENT);
        const staffRead = conversation.participants.find((p) => p.user.role !== UserRole.PARENT);

        return {
          id: conversation.id,
          subject: conversation.subject,
          status: conversation.status,
          lastMessageAt: conversation.lastMessageAt,
          lastMessage: conversation.messages[0]?.body ?? null,
          parent: parent
            ? {
                id: parent.user.id,
                name: `${parent.user.firstName} ${parent.user.lastName ?? ''}`.trim(),
              }
            : null,
          priority: parent
            ? await this.entitlements.can(parent.user.id, 'chat_priority')
            : false,
          unread: await this.unreadCount(conversation.id, staffRead?.lastReadAt, true),
        };
      }),
    );

    // პრიორიტეტული წინ, შემდეგ ბოლო შეტყობინების მიხედვით
    return rows.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0);
    });
  }

  async start(dto: StartConversationDto, userId: string) {
    // მიმდინარე საუბარი უკვე თუ აქვს, ახალს არ ვხსნით — ოპერატორს ორ
    // ადგილას ერთი და იგივე კითხვა დახვდებოდა
    const open = await this.prisma.conversation.findFirst({
      where: {
        participants: { some: { userId } },
        status: { in: WRITABLE },
      },
      select: { id: true },
    });

    if (open) return this.send(open.id, { body: dto.message }, userId, UserRole.PARENT);

    const conversation = await this.prisma.conversation.create({
      data: {
        subject: dto.subject?.trim() || 'შეკითხვა',
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
        participants: { create: { userId } },
        messages: {
          create: { senderId: userId, type: MessageType.TEXT, body: dto.message.trim() },
        },
      },
      select: { id: true },
    });

    await this.notifyStaff(conversation.id, dto.message.trim());

    return this.messages(conversation.id, userId, UserRole.PARENT);
  }

  async messages(conversationId: string, userId: string, role: UserRole) {
    const conversation = await this.assertAccess(conversationId, userId, role);

    const messages = await this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: MESSAGE_SELECT,
    });

    await this.markRead(conversationId, userId, role);

    return {
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      messages,
    };
  }

  async send(conversationId: string, dto: SendMessageDto, userId: string, role: UserRole) {
    const conversation = await this.assertAccess(conversationId, userId, role);

    if (!WRITABLE.includes(conversation.status)) {
      throw new ForbiddenException('საუბარი დახურულია — გახსენით ახალი');
    }

    // პერსონალი პასუხისას საუბრის მონაწილე ხდება, რომ წაკითხვა აღირიცხოს
    if (STAFF_ROLES.includes(role)) {
      await this.prisma.conversationUser.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        update: {},
        create: { conversationId, userId },
      });
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: MessageType.TEXT,
        body: dto.body.trim(),
      },
      select: MESSAGE_SELECT,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        // ოპერატორის პასუხი საუბარს მიღებულად აქცევს
        status: STAFF_ROLES.includes(role)
          ? ConversationStatus.ASSIGNED
          : conversation.status,
        assignedOperatorId: STAFF_ROLES.includes(role)
          ? (conversation.assignedOperatorId ?? userId)
          : conversation.assignedOperatorId,
      },
    });

    if (STAFF_ROLES.includes(role)) {
      await this.notifyParent(conversationId, dto.body.trim());
    } else {
      await this.notifyStaff(conversationId, dto.body.trim());
    }

    return message;
  }

  /**
   * საუბრის დახურვა — მხოლოდ პერსონალს.
   *
   * დახურვისთანავე მშობელს შეფასების თხოვნა მიდის: ცოცხალ პასუხზე
   * ხარისხის გაზომვა სხვაგვარად შეუძლებელია.
   */
  async close(conversationId: string, userId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.CLOSED,
        closedAt: new Date(),
        assignedOperatorId: userId,
      },
    });

    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: MessageType.SYSTEM,
        body: 'საუბარი დაიხურა',
      },
    });

    await this.requestFeedback(conversationId, userId);

    return { message: 'საუბარი დაიხურა', id: conversationId };
  }

  /**
   * შეფასების თხოვნა.
   *
   * ბმულს ერთჯერადი `token` აქვს — SMS-იდან გახსნისას მშობელს
   * ხელახალი ავტორიზაცია არ სჭირდება, თორემ შეფასებამდე ვერ მივიდოდა.
   */
  private async requestFeedback(conversationId: string, operatorId: string): Promise<void> {
    const parent = await this.prisma.conversationUser.findFirst({
      where: { conversationId, user: { role: UserRole.PARENT } },
      select: { user: { select: { id: true, firstName: true, phone: true } } },
    });
    if (!parent) return;

    const feedback = await this.prisma.conversationFeedback.upsert({
      where: { conversationId },
      update: { operatorId },
      create: {
        conversationId,
        parentId: parent.user.id,
        operatorId,
        token: randomBytes(16).toString('hex'),
      },
      select: { token: true, rating: true },
    });

    // უკვე შეფასებულს მეორედ არ ვთხოვთ
    if (feedback.rating) return;

    const link = `${this.config.get<string>('webUrl')}/feedback/${feedback.token}`;
    const body = `გმადლობთ მოკითხვისთვის! გთხოვთ, შეაფასოთ საუბარი კონსულტანტთან: ${link}`;

    await this.prisma.notification.create({
      data: {
        userId: parent.user.id,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title: 'შეაფასეთ საუბარი',
        body: 'თქვენი შეფასება დაგვეხმარება პასუხების ხარისხის გაუმჯობესებაში',
        data: { feedbackToken: feedback.token } as Prisma.InputJsonValue,
        sentAt: new Date(),
      },
    });

    if (!parent.user.phone) return;

    await this.sms
      .send({
        userId: parent.user.id,
        phone: parent.user.phone,
        body,
        templateKey: 'chat_feedback',
      })
      .catch((error: unknown) => {
        this.logger.warn(`შეფასების SMS ვერ გაიგზავნა: ${String(error)}`);
      });
  }

  /** შეფასების ფორმა ბმულით — ავტორიზაციის გარეშე. */
  async feedbackByToken(token: string) {
    const feedback = await this.prisma.conversationFeedback.findUnique({
      where: { token },
      select: {
        token: true,
        rating: true,
        comment: true,
        ratedAt: true,
        operator: { select: { firstName: true } },
      },
    });
    if (!feedback) throw new NotFoundException('შეფასების ბმული აღარ მოქმედებს');

    return feedback;
  }

  /** შეფასების ჩაწერა — ერთხელ; შეცვლა შესაძლებელია იმავე ბმულით. */
  async rate(token: string, dto: RateConversationDto) {
    const feedback = await this.prisma.conversationFeedback.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!feedback) throw new NotFoundException('შეფასების ბმული აღარ მოქმედებს');

    await this.prisma.conversationFeedback.update({
      where: { id: feedback.id },
      data: {
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        ratedAt: new Date(),
      },
    });

    return { message: 'გმადლობთ შეფასებისთვის' };
  }

  /** ოპერატორების შეფასებები — ვის როგორ პასუხობენ. */
  async feedbackSummary() {
    const rated = await this.prisma.conversationFeedback.findMany({
      where: { rating: { not: null } },
      orderBy: { ratedAt: 'desc' },
      take: 100,
      select: {
        rating: true,
        comment: true,
        ratedAt: true,
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const sum = rated.reduce((total, row) => total + (row.rating ?? 0), 0);

    return {
      count: rated.length,
      average: rated.length ? Number((sum / rated.length).toFixed(2)) : null,
      items: rated,
    };
  }

  /** წაუკითხავი შეტყობინებები — მეორე მხარისგან და წაკითხვის შემდეგ. */
  private async unreadCount(
    conversationId: string,
    lastReadAt: Date | null | undefined,
    forStaff = false,
  ): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversationId,
        deletedAt: null,
        createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
        sender: forStaff ? { role: UserRole.PARENT } : { role: { in: STAFF_ROLES } },
      },
    });
  }

  private async markRead(conversationId: string, userId: string, role: UserRole): Promise<void> {
    if (STAFF_ROLES.includes(role)) {
      await this.prisma.conversationUser.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        update: { lastReadAt: new Date() },
        create: { conversationId, userId, lastReadAt: new Date() },
      });
      return;
    }

    await this.prisma.conversationUser.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  private async assertAccess(conversationId: string, userId: string, role: UserRole) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        subject: true,
        status: true,
        assignedOperatorId: true,
        participants: { select: { userId: true } },
      },
    });
    if (!conversation) throw new NotFoundException('საუბარი ვერ მოიძებნა');

    // პერსონალი ყველა საუბარს ხედავს — რიგი საერთოა
    if (STAFF_ROLES.includes(role)) return conversation;

    if (!conversation.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('ეს საუბარი თქვენი არ არის');
    }

    return conversation;
  }

  /** ახალი შეკითხვა — პერსონალს in-app შეტყობინება. */
  private async notifyStaff(conversationId: string, preview: string): Promise<void> {
    const staff = await this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES }, deletedAt: null },
      select: { id: true },
    });

    await this.prisma.notification.createMany({
      data: staff.map((user) => ({
        userId: user.id,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title: 'ახალი შეკითხვა ჩატში',
        body: preview.slice(0, 140),
        data: { conversationId } as Prisma.InputJsonValue,
        sentAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  /** ოპერატორის პასუხი — მშობელს შეტყობინება. */
  private async notifyParent(conversationId: string, preview: string): Promise<void> {
    const participants = await this.prisma.conversationUser.findMany({
      where: { conversationId, user: { role: UserRole.PARENT } },
      select: { userId: true },
    });

    await this.prisma.notification.createMany({
      data: participants.map((p) => ({
        userId: p.userId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title: 'პასუხი კონსულტანტისგან',
        body: preview.slice(0, 140),
        data: { conversationId } as Prisma.InputJsonValue,
        sentAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }
}
