import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiRole, UserRole } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SYSTEM_PROMPT, childContext } from './ai.prompt';
import { AI_TOOLS, AiToolsService, type ToolContext } from './ai.tools';
import { AskDto } from './dto/ai.dto';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/** რამდენი წინა შეტყობინება მიჰყვება კითხვას — საუბრის ძაფი და ხარჯი ბალანსშია. */
const HISTORY_LIMIT = 20;

interface ContentBlock {
  type: string;
  text?: string;
  /** tool_use ბლოკისთვის */
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

/**
 * რამდენჯერ დაიშვება ინსტრუმენტის გამოძახება ერთ პასუხზე.
 *
 * ყოველი რაუნდი ცალკე მოთხოვნაა Anthropic-თან, ანუ ერთი შეკითხვა
 * რამდენიმე გამოძახებად იქცევა. სამი საკმარისია (მაგ. „ბავშვის ასაკი →
 * დოზა → პასუხი"), მეტი კი ლიმიტსა და ხარჯს ტყუილად ხარჯავს.
 */
const MAX_TOOL_ROUNDS = 3;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tools: AiToolsService,
  ) {}

  /** ასისტენტი ჩართულია თუ არა — გასაღების გარეშე ღილაკიც არ უნდა ჩანდეს. */
  get enabled(): boolean {
    return !!this.config.get<string>('ai.apiKey');
  }

  async ask(dto: AskDto, userId: string) {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI ასისტენტი ჯერ არ არის ჩართული');
    }

    await this.assertWithinDailyLimit(userId);

    const conversation = await this.resolveConversation(dto, userId);
    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      select: { role: true, content: true },
    });

    const messages = [
      ...history.reverse().map((m) => ({
        role: m.role === AiRole.USER ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user' as const, content: dto.message.trim() },
    ];

    const answer = await this.call(
      messages,
      await this.systemFor(conversation.childId),
      { userId, role: UserRole.PARENT },
    );

    // ორივე მხარე ერთ ტრანზაქციაში — კითხვა უპასუხოდ ბაზაში არ უნდა დარჩეს
    const [, assistantMessage] = await this.prisma.$transaction([
      this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: AiRole.USER,
          content: dto.message.trim(),
        },
      }),
      this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: AiRole.ASSISTANT,
          content: answer.text,
          inputTokens: answer.inputTokens,
          outputTokens: answer.outputTokens,
        },
      }),
      this.prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: AiRole.ASSISTANT,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
      },
    };
  }

  async listConversations(userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        child: { select: { id: true, firstName: true } },
      },
    });
  }

  async messages(conversationId: string, userId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      select: { id: true, userId: true, title: true },
    });
    if (!conversation) throw new NotFoundException('საუბარი ვერ მოიძებნა');
    if (conversation.userId !== userId) throw new ForbiddenException('ეს საუბარი თქვენი არ არის');

    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    return { id: conversation.id, title: conversation.title, messages };
  }

  /** საუბრის წაშლა — რბილი, რომ ხარჯის აღრიცხვა არ დაიკარგოს. */
  async remove(conversationId: string, userId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      select: { id: true, userId: true },
    });
    if (!conversation) throw new NotFoundException('საუბარი ვერ მოიძებნა');
    if (conversation.userId !== userId) throw new ForbiddenException('ეს საუბარი თქვენი არ არის');

    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    });

    return { message: 'საუბარი წაშლილია', id: conversationId };
  }

  /**
   * დღიური ლიმიტი.
   *
   * ყოველი პასუხი ფულია. ლიმიტის გარეშე ერთი გახსნილი ჩატი
   * ღამით ასობით მოთხოვნას გააგზავნიდა.
   */
  private async assertWithinDailyLimit(userId: string): Promise<void> {
    const limit = this.config.get<number>('ai.dailyLimit') ?? 10;
    if (limit <= 0) return;

    // ტესტის ანგარიშებს ლიმიტი არ ეხებათ — შემოწმებას ხელს შეუშლიდა
    const exempt = this.config.get<string[]>('ai.unlimitedEmails') ?? [];
    if (exempt.length) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email && exempt.includes(user.email.toLowerCase())) return;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const used = await this.prisma.aiMessage.count({
      where: {
        role: AiRole.USER,
        createdAt: { gte: since },
        conversation: { userId },
      },
    });

    if (used >= limit) {
      throw new ForbiddenException(
        `დღიური ლიმიტი ამოიწურა (${limit} შეკითხვა). სცადეთ ხვალ.`,
      );
    }
  }

  /** არსებული საუბარი ან ახალი — სათაური პირველი კითხვიდან იწერება. */
  private async resolveConversation(dto: AskDto, userId: string) {
    if (dto.conversationId) {
      const existing = await this.prisma.aiConversation.findFirst({
        where: { id: dto.conversationId, deletedAt: null },
        select: { id: true, userId: true, childId: true },
      });
      if (!existing) throw new NotFoundException('საუბარი ვერ მოიძებნა');
      if (existing.userId !== userId) throw new ForbiddenException('ეს საუბარი თქვენი არ არის');

      return existing;
    }

    if (dto.childId) {
      const child = await this.prisma.child.findFirst({
        where: { id: dto.childId, deletedAt: null },
        select: { parentId: true },
      });
      if (!child) throw new NotFoundException('ბავშვის პროფილი ვერ მოიძებნა');
      if (child.parentId !== userId) throw new ForbiddenException('ეს პროფილი თქვენი არ არის');
    }

    const title = dto.message.trim().slice(0, 60);

    return this.prisma.aiConversation.create({
      data: { userId, childId: dto.childId, title },
      select: { id: true, userId: true, childId: true },
    });
  }

  /** სისტემური მითითება ბავშვის ასაკით შევსებული. */
  private async systemFor(childId: string | null): Promise<string> {
    if (!childId) return SYSTEM_PROMPT;

    const child = await this.prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: { firstName: true, birthDate: true, gestationalWeek: true },
    });
    if (!child) return SYSTEM_PROMPT;

    const ageMonths = Math.max(
      0,
      Math.floor((Date.now() - child.birthDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)),
    );

    const context = childContext({
      firstName: child.firstName,
      ageMonths,
      isPreterm: !!child.gestationalWeek && child.gestationalWeek < 37,
      gestationalWeek: child.gestationalWeek,
    });

    return `${SYSTEM_PROMPT}\n\n${context}`;
  }

  /**
   * მოთხოვნა მოდელთან.
   *
   * SDK-ის ნაცვლად პირდაპირი HTTP: ერთადერთი ენდპოინტისთვის დამატებითი
   * დამოკიდებულება Docker-ის ხატულას უმიზეზოდ ზრდის.
   */
  /**
   * მოთხოვნა მოდელთან, ინსტრუმენტების ციკლით.
   *
   * ციფრი და ფაქტი მოდელის მეხსიერებიდან არ უნდა მოდიოდეს: როცა
   * პასუხს დოზა, აცრის ვადა თუ ბავშვის მონაცემი სჭირდება, მოდელი
   * ინსტრუმენტს იძახებს, ჩვენი კოდი ითვლის და შედეგი უბრუნდება.
   *
   * SDK-ის ნაცვლად პირდაპირი HTTP: ერთადერთი ენდპოინტისთვის დამატებითი
   * დამოკიდებულება Docker-ის ხატულას უმიზეზოდ ზრდის.
   */
  private async call(
    messages: { role: 'user' | 'assistant'; content: unknown }[],
    system: string,
    ctx: ToolContext,
  ): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
    const thread = [...messages];
    let inputTokens = 0;
    let outputTokens = 0;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const payload = await this.request(thread, system);

      inputTokens += payload.usage?.input_tokens ?? 0;
      outputTokens += payload.usage?.output_tokens ?? 0;

      const toolCalls = payload.content.filter((block) => block.type === 'tool_use');

      if (!toolCalls.length || round === MAX_TOOL_ROUNDS) {
        const text = payload.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text ?? '')
          .join('\n')
          .trim();

        if (!text) throw new ServiceUnavailableException('ასისტენტმა პასუხი ვერ დააბრუნა');

        // ლიმიტმა შეაწყვეტინა — მშობელს ნახევარი წინადადება არ უნდა დარჩეს
        if (payload.stop_reason === 'max_tokens') {
          this.logger.warn('პასუხი ტოკენების ლიმიტს მიაღწია — AI_MAX_TOKENS გაზრდას საჭიროებს');
          return { text: `${text}…`, inputTokens, outputTokens };
        }

        return { text, inputTokens, outputTokens };
      }

      thread.push({ role: 'assistant', content: payload.content });

      const results = await Promise.all(
        toolCalls.map(async (call) => {
          const data = await this.tools
            .run(call.name ?? '', call.input ?? {}, ctx)
            .catch((error: unknown) => {
              this.logger.warn(`ინსტრუმენტი "${call.name}" ჩავარდა: ${String(error)}`);
              return { error: 'მონაცემი ვერ წამოვიღეთ' };
            });

          return {
            type: 'tool_result' as const,
            tool_use_id: call.id,
            content: JSON.stringify(data),
          };
        }),
      );

      thread.push({ role: 'user', content: results });
    }

    throw new ServiceUnavailableException('ასისტენტი დროებით მიუწვდომელია');
  }

  /** ერთი მოთხოვნა Anthropic-თან. */
  private async request(
    messages: { role: 'user' | 'assistant'; content: unknown }[],
    system: string,
  ): Promise<AnthropicResponse> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.config.get<string>('ai.apiKey')!,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: this.config.get<string>('ai.model'),
        max_tokens: this.config.get<number>('ai.maxTokens') ?? 900,
        system,
        tools: AI_TOOLS,
        messages,
      }),
    }).catch((error: unknown) => {
      this.logger.error(`ასისტენტთან კავშირი ვერ დამყარდა: ${String(error)}`);
      throw new ServiceUnavailableException('ასისტენტი დროებით მიუწვდომელია');
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`ასისტენტმა დააბრუნა ${response.status}: ${detail.slice(0, 300)}`);

      // 429 — მოთხოვნების ლიმიტი; მშობელს ლოდინი უნდა ვურჩიოთ და არა ხელახლა ცდა
      if (response.status === 429) {
        throw new ServiceUnavailableException(
          'ასისტენტი ამ წუთას გადატვირთულია — სცადეთ ერთ წუთში',
        );
      }

      throw new ServiceUnavailableException('ასისტენტი დროებით მიუწვდომელია');
    }

    return (await response.json()) as AnthropicResponse;
  }
}
