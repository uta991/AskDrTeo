import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationStatus,
  MediaStatus,
  MediaType,
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
import { MediaAccessService } from '../media/media-access.service';
import { SmsService } from '../sms/sms.service';
import { VIDEO_STORAGE, type VideoStorageProvider } from '../storage/storage.types';
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
  attachments: {
    orderBy: { position: 'asc' },
    select: {
      assetId: true,
      asset: { select: { id: true, type: true, status: true, playbackId: true } },
    },
  },
} satisfies Prisma.MessageSelect;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
    private readonly mediaAccess: MediaAccessService,
    @Inject(VIDEO_STORAGE) private readonly videoStorage: VideoStorageProvider,
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
          select: {
            body: true,
            createdAt: true,
            senderId: true,
            sender: { select: { firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    return Promise.all(
      conversations.map(async (conversation) => ({
        id: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        createdAt: conversation.createdAt,
        closedAt: conversation.closedAt,
        lastMessageAt: conversation.lastMessageAt,
        lastMessage: conversation.messages[0]?.body ?? null,
        // ვისთან ჰქონდა საუბარი — ისტორიაში სახელი უნდა ჩანდეს
        operators: this.staffNames(conversation.messages),
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

  /**
   * წაუკითხავი შეკითხვები პერსონალისთვის.
   *
   * ორი რიცხვი: რამდენ საუბარში წერენ და სულ რამდენი შეტყობინებაა
   * უპასუხოდ — ნიშანს პირველი სჭირდება, რიგის შეფასებას მეორე.
   */
  async unreadForStaff(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { status: { not: ConversationStatus.CLOSED } },
      select: {
        id: true,
        participants: { where: { userId }, select: { lastReadAt: true } },
      },
    });

    let messages = 0;
    let waiting = 0;

    for (const conversation of conversations) {
      const unread = await this.unreadCount(
        conversation.id,
        conversation.participants[0]?.lastReadAt,
        true,
      );

      if (unread > 0) {
        waiting += 1;
        messages += unread;
      }
    }

    return { conversations: waiting, messages };
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

    const text = dto.message?.trim();

    // მიმდინარე საუბარი უკვე აქვს — ახალ წერილს იქ ვამატებთ
    if (open) {
      if (text) await this.send(open.id, { body: text }, userId, UserRole.PARENT);
      return this.messages(open.id, userId, UserRole.PARENT);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        subject: dto.subject?.trim() || 'შეკითხვა',
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
        participants: { create: { userId } },
        ...(text
          ? {
              messages: {
                create: { senderId: userId, type: MessageType.TEXT, body: text },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    await this.autoReply(conversation.id, userId);

    // ოპერატორს მაშინ ვაწუხებთ, როცა კითხვა უკვე დაწერილია
    if (text) await this.notifyStaff(conversation.id, text);

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
      assignedOperatorId: conversation.assignedOperatorId,
      messages: await Promise.all(
        messages.map(async (message) => ({
          ...message,
          attachments: await this.presentAttachments(message.attachments, { id: userId, role }),
        })),
      ),
    };
  }

  async send(conversationId: string, dto: SendMessageDto, userId: string, role: UserRole) {
    const conversation = await this.assertAccess(conversationId, userId, role);

    if (!WRITABLE.includes(conversation.status)) {
      throw new ForbiddenException('საუბარი დახურულია — გახსენით ახალი');
    }

    const assetIds = dto.assetIds ?? [];
    const text = dto.body?.trim() ?? '';

    if (!text && !assetIds.length) {
      throw new ForbiddenException('შეტყობინება ცარიელია');
    }

    // მხოლოდ საკუთარი ატვირთული ფაილი — სხვისი ბმულით მიმაგრება დაუშვებელია
    if (assetIds.length) {
      const owned = await this.prisma.mediaAsset.count({
        where: { id: { in: assetIds }, ownerId: userId, deletedAt: null },
      });
      if (owned !== assetIds.length) {
        throw new ForbiddenException('მიმაგრებული ფაილი ვერ მოიძებნა');
      }
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
        type: assetIds.length && !text ? MessageType.IMAGE : MessageType.TEXT,
        body: text || null,
        attachments: {
          create: assetIds.map((assetId, position) => ({ assetId, position })),
        },
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

    const preview = text || (assetIds.length ? 'ფაილი მიმაგრებულია' : '');

    if (STAFF_ROLES.includes(role)) {
      await this.notifyParent(conversationId, preview);
    } else {
      await this.autoReply(conversationId, userId);
      await this.notifyStaff(conversationId, preview);
    }

    return message;
  }

  /**
   * საუბრის აღება.
   *
   * ოპერატორი საკუთარ თავს ამბობს — მშობელმა უნდა იცოდეს, ვის
   * ელაპარაკება. მიმაგრება ცალკე ღილაკია და არა გახსნისას: რიგის
   * დათვალიერება ჯერ არ ნიშნავს, რომ პასუხს ეს ოპერატორი აგებს.
   */
  async take(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, status: true, assignedOperatorId: true },
    });
    if (!conversation) throw new NotFoundException('საუბარი ვერ მოიძებნა');

    if (conversation.assignedOperatorId && conversation.assignedOperatorId !== userId) {
      throw new ForbiddenException('საუბარი სხვა ოპერატორს აქვს აღებული');
    }

    const operator = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.ASSIGNED,
        assignedOperatorId: userId,
        lastMessageAt: new Date(),
      },
    });

    await this.prisma.conversationUser.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: {},
      create: { conversationId, userId },
    });

    const greeting =
      `ოპერატორი ${operator?.firstName ?? 'კონსულტანტი'} გისმენთ. ` +
      'რით შემიძლია დაგეხმაროთ?';

    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: MessageType.TEXT,
        body: greeting,
      },
    });

    await this.notifyParent(conversationId, greeting);

    // ერთი გავიდა რიგიდან — დანარჩენებმა ახალი ადგილი უნდა იცოდნენ
    await this.announceQueue(conversationId);

    return { message: 'საუბარი აღებულია', id: conversationId };
  }


  /**
   * ლოდინის რიგი.
   *
   * მხოლოდ აუღებელი საუბრები: აღებულს ოპერატორი უკვე პასუხობს.
   * თანმიმდევრობა იგივეა, რაც ოპერატორის რიგში — პრიორიტეტული
   * პაკეტი წინ დგას, დანარჩენი მოსვლის მიხედვით.
   */
  private async waitingQueue(): Promise<{ id: string; parentId: string | null }[]> {
    const waiting = await this.prisma.conversation.findMany({
      where: { status: ConversationStatus.OPEN },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        participants: {
          where: { user: { role: UserRole.PARENT } },
          select: { userId: true },
        },
      },
    });

    const rows = await Promise.all(
      waiting.map(async (conversation) => {
        const parentId = conversation.participants[0]?.userId ?? null;

        return {
          id: conversation.id,
          parentId,
          priority: parentId ? await this.entitlements.can(parentId, 'chat_priority') : false,
        };
      }),
    );

    return rows.sort((a, b) => (a.priority === b.priority ? 0 : a.priority ? -1 : 1));
  }

  /**
   * რიგის განახლება.
   *
   * ოპერატორი როცა ერთს გაისტუმრებს, დანარჩენები წინ იწევენ და ამის
   * თქმა ჩვენი საქმეა — თორემ მშობელი ვერ გაიგებს, დაავიწყდნენ თუ არა.
   * შეტყობინება მხოლოდ მაშინ იგზავნება, როცა ადგილი შეიცვალა.
   */
  private async announceQueue(skipConversationId?: string): Promise<void> {
    const queue = await this.waitingQueue();

    for (const [index, item] of queue.entries()) {
      const position = index + 1;
      if (item.id === skipConversationId) continue;

      const conversation = await this.prisma.conversation.findUnique({
        where: { id: item.id },
        select: { queueNoticePosition: true },
      });
      if (conversation?.queueNoticePosition === position) continue;

      await this.prisma.conversation.update({
        where: { id: item.id },
        data: { queueNoticePosition: position },
      });

      // პირველ ადგილს ცალკე ტექსტი აქვს — „რიგში პირველი" ბუნდოვანია
      const body =
        position === 1
          ? 'თქვენ შემდეგი ხართ — კონსულტანტი უახლოეს წუთებში გიპასუხებთ.'
          : `თქვენ ხართ რიგში ${ordinal(position)} — კონსულტანტი მალე გიპასუხებთ.`;

      await this.prisma.message.create({
        data: { conversationId: item.id, type: MessageType.TEXT, body },
      });

      if (item.parentId) {
        await this.prisma.notification.create({
          data: {
            userId: item.parentId,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            title: 'რიგი ჩატში',
            body,
            data: { conversationId: item.id } as Prisma.InputJsonValue,
            sentAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * ავტომატური პასუხი.
   *
   * მშობელს დაწერისთანავე უნდა დაუდასტურდეს, რომ შეკითხვა მივიდა —
   * თორემ ცარიელ ეკრანს უყურებს და ვერ ხვდება, გაიგზავნა თუ არა.
   * ერთხელ იგზავნება: ცოცხალი პასუხის შემდეგ აღარ მეორდება.
   */
  private async autoReply(conversationId: string, parentId: string): Promise<void> {
    const existing = await this.prisma.message.findFirst({
      where: {
        conversationId,
        OR: [{ type: MessageType.SYSTEM }, { sender: { role: { in: STAFF_ROLES } } }],
      },
      select: { id: true },
    });

    // ან უკვე გავეცით, ან ოპერატორმა ცოცხლად უპასუხა
    if (existing) return;

    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { firstName: true },
    });

    const queue = await this.waitingQueue();
    const position = queue.findIndex((item) => item.id === conversationId) + 1;

    const waitLine =
      position > 1
        ? `თქვენ ხართ რიგში ${ordinal(position)} — კონსულტანტი მალე გიპასუხებთ.`
        : 'კონსულტანტი მალე გიპასუხებთ.';

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { queueNoticePosition: position || 1 },
    });

    // TEXT და არა SYSTEM: მშობელს ცოცხალი პასუხივით უნდა დაუჯდეს
    // თვალში, ნაცრისფერ სისტემურ წარწერად კი არა. ავტორი ცარიელია —
    // კონკრეტული ოპერატორი ჯერ არ ჰყავს.
    await this.prisma.message.create({
      data: {
        conversationId,
        type: MessageType.TEXT,
        body: `გამარჯობა, ${parent?.firstName ?? ''}! თქვენი შეკითხვა მივიღეთ. ${waitLine}`,
      },
    });
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
    await this.announceQueue(conversationId);

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
      select: { id: true, token: true, rating: true },
    });

    await this.recordOperators(conversationId, feedback.id, operatorId);

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

  /**
   * ერთი მომხმარებლის ჩატის ისტორია — ადმინის პანელისთვის.
   *
   * ანგარიშის ქვეშ უნდა ჩანდეს, რა თარიღში მოიწერა, ვინ უპასუხა და
   * რაზე იყო საუბარი: ერთი დახურული ჩატი ისტორიაა და არა ნაგავი.
   */
  async historyFor(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            body: true,
            createdAt: true,
            type: true,
            sender: { select: { firstName: true, lastName: true, role: true } },
          },
        },
        feedback: { select: { rating: true, comment: true } },
      },
    });

    return conversations.map((conversation) => ({
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      createdAt: conversation.createdAt,
      closedAt: conversation.closedAt,
      messageCount: conversation.messages.length,
      operators: this.staffNames(conversation.messages),
      firstMessage:
        conversation.messages.find((message) => message.sender?.role === UserRole.PARENT)?.body ??
        null,
      rating: conversation.feedback?.rating ?? null,
      comment: conversation.feedback?.comment ?? null,
    }));
  }

  /**
   * დანართების ბმულები.
   *
   * ფოტოს ხელმოწერილი ბმული გამოაქვს, ვიდეოს — iframe. ბმული ყოველ
   * ჯერზე ახლიდან იწერება: ვადიანი მისამართის ბაზაში შენახვას აზრი
   * არ აქვს.
   */
  private async presentAttachments(
    attachments: {
      assetId: string;
      asset: { id: string; type: MediaType; status: MediaStatus; playbackId: string | null };
    }[],
    viewer: { id: string; role: UserRole },
  ) {
    return Promise.all(
      attachments.map(async (attachment) => {
        const video = attachment.asset.type === MediaType.VIDEO;
        const ready = attachment.asset.status === MediaStatus.READY;

        if (video) {
          return {
            id: attachment.assetId,
            type: 'VIDEO' as const,
            processing: !ready,
            url:
              ready && attachment.asset.playbackId
                ? this.videoStorage.embedUrl(attachment.asset.playbackId)
                : null,
          };
        }

        const url = await this.mediaAccess
          .urlFor(attachment.assetId, viewer)
          .catch(() => null);

        return { id: attachment.assetId, type: 'IMAGE' as const, processing: false, url };
      }),
    );
  }

  /** მოპასუხე ოპერატორების სახელები — გამეორების გარეშე. */
  private staffNames(
    messages: { sender?: { firstName: string; lastName: string | null; role: UserRole } | null }[],
  ): string[] {
    const names = messages
      .filter((message) => message.sender && STAFF_ROLES.includes(message.sender.role))
      .map((message) => `${message.sender!.firstName} ${message.sender!.lastName ?? ''}`.trim());

    return [...new Set(names)];
  }

  /**
   * ვინ პასუხობდა ამ საუბარს.
   *
   * ერთი საუბარი ხშირად ორ ოპერატორზე გადის — ერთი იწყებს, მეორე
   * ცვლაში აგრძელებს. შეფასება ორივეს უნდა მიეწეროს.
   */
  private async recordOperators(
    conversationId: string,
    feedbackId: string,
    closedBy: string,
  ): Promise<void> {
    const replies = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: {
        conversationId,
        deletedAt: null,
        type: MessageType.TEXT,
        sender: { role: { in: STAFF_ROLES } },
      },
      _count: { _all: true },
    });

    const counts = new Map(
      replies
        .filter((row): row is typeof row & { senderId: string } => !!row.senderId)
        .map((row) => [row.senderId, row._count._all]),
    );

    // დამხურავიც ითვლება, თუნდაც პასუხი არ დაეწეროს
    if (!counts.has(closedBy)) counts.set(closedBy, 0);

    for (const [operatorId, messageCount] of counts) {
      await this.prisma.conversationFeedbackOperator.upsert({
        where: { feedbackId_operatorId: { feedbackId, operatorId } },
        update: { messageCount },
        create: { feedbackId, operatorId, messageCount },
      });
    }
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

  /**
   * შეფასებების შეჯამება.
   *
   * ქულა ყველა მოპასუხე ოპერატორს ეწერება: ერთი საუბარი ხშირად
   * ორ ცვლაზე გადის და მხოლოდ დამხურავისთვის მიწერა არასწორი იქნებოდა.
   */
  async feedbackSummary(operatorId?: string) {
    const rated = await this.prisma.conversationFeedback.findMany({
      where: {
        rating: { not: null },
        // მონიშნული ოპერატორი: მისი მონაწილეობით საუბრები
        ...(operatorId
          ? {
              OR: [{ operatorId }, { operators: { some: { operatorId } } }],
            }
          : {}),
      },
      orderBy: { ratedAt: 'desc' },
      take: 100,
      select: {
        rating: true,
        comment: true,
        ratedAt: true,
        operator: { select: { id: true, firstName: true, lastName: true } },
        operators: {
          select: {
            messageCount: true,
            operator: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const sum = rated.reduce((total, row) => total + (row.rating ?? 0), 0);

    // ოპერატორების ჭრილი — ვის რა საშუალო აქვს
    const perOperator = new Map<string, { name: string; total: number; count: number }>();

    for (const row of rated) {
      const participants = row.operators.length
        ? row.operators.map((item) => item.operator)
        : row.operator
          ? [row.operator]
          : [];

      for (const operator of participants) {
        const name = `${operator.firstName} ${operator.lastName ?? ''}`.trim();
        const current = perOperator.get(operator.id) ?? { name, total: 0, count: 0 };

        current.total += row.rating ?? 0;
        current.count += 1;
        perOperator.set(operator.id, current);
      }
    }

    const operators = [...perOperator.entries()]
      .map(([id, row]) => ({
        id,
        name: row.name,
        count: row.count,
        average: Number((row.total / row.count).toFixed(2)),
      }))
      .sort((a, b) => b.average - a.average);

    return {
      count: rated.length,
      average: rated.length ? Number((sum / rated.length).toFixed(2)) : null,
      operators,
      items: rated.map((row) => ({
        rating: row.rating,
        comment: row.comment,
        ratedAt: row.ratedAt,
        operator: row.operator,
        operators: row.operators.map((item) => ({
          id: item.operator.id,
          name: `${item.operator.firstName} ${item.operator.lastName ?? ''}`.trim(),
          messageCount: item.messageCount,
        })),
      })),
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

/** რიგითი რიცხვი ქართულად — „მე-14" ხმამაღლა წაკითხვისას უფრო ბუნებრივია. */
function ordinal(position: number): string {
  const words = [
    '',
    'პირველი',
    'მეორე',
    'მესამე',
    'მეოთხე',
    'მეხუთე',
    'მეექვსე',
    'მეშვიდე',
    'მერვე',
    'მეცხრე',
    'მეათე',
  ];

  return words[position] ?? `მე-${position}`;
}
