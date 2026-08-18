import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, MilestoneAnswer, Prisma, UserRole } from '@prisma/client';
import {
  evaluate,
  questionsForAge,
  type MilestoneAnswer as SharedAnswer,
  type MilestoneDomain as SharedDomain,
  type Question,
} from '@askdrteo/milestones';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateQuestionDto, SubmitAssessmentDto } from './dto/milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * ასაკის კითხვები.
   *
   * წინა თვეებიც შედის — 8 თვის ბავშვს 6 თვის უნარებიც უნდა ჰქონდეს.
   * შერჩევის წესი საერთო პაკეტშია, რომ ვებმა და აპლიკაციამ ერთი და
   * იგივე კითხვები დაინახონ.
   */
  async questionsFor(ageMonths: number): Promise<Question[]> {
    const all = await this.prisma.milestoneQuestion.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        code: true,
        ageMonths: true,
        domain: true,
        questionKa: true,
        redFlag: true,
      },
    });

    return questionsForAge(all as unknown as Question[], ageMonths);
  }

  /** შევსებული კითხვარის შენახვა და შეფასება. */
  async submit(dto: SubmitAssessmentDto, userId: string, role: UserRole) {
    const child = await this.prisma.child.findFirst({
      where: { id: dto.childId, deletedAt: null },
      select: { id: true, parentId: true, birthDate: true },
    });
    if (!child) throw new NotFoundException('ბავშვის პროფილი ვერ მოიძებნა');

    // მშობელი მხოლოდ საკუთარ ბავშვს აფასებს; პერსონალს ჩატისთვის სჭირდება
    if (role === UserRole.PARENT && child.parentId !== userId) {
      throw new ForbiddenException('ეს პროფილი თქვენი არ არის');
    }

    const ageMonths = monthsSince(child.birthDate);

    const questions = await this.prisma.milestoneQuestion.findMany({
      where: { id: { in: dto.answers.map((a) => a.questionId) }, deletedAt: null },
      select: {
        id: true,
        code: true,
        ageMonths: true,
        domain: true,
        questionKa: true,
        redFlag: true,
      },
    });

    const answers: Record<string, SharedAnswer> = {};
    for (const item of dto.answers) answers[item.questionId] = item.answer as SharedAnswer;

    const result = evaluate(questions as unknown as Question[], answers, ageMonths);

    const assessment = await this.prisma.milestoneAssessment.create({
      data: {
        childId: child.id,
        ageMonths,
        summary: result as unknown as Prisma.InputJsonValue,
        hasRedFlag: result.hasRedFlag,
        answers: {
          create: dto.answers.map((a) => ({
            questionId: a.questionId,
            answer: a.answer as MilestoneAnswer,
          })),
        },
      },
    });

    return { id: assessment.id, ...result };
  }

  /** ბავშვის ისტორია — უახლესი პირველი. */
  async history(childId: string, userId: string, role: UserRole) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: { parentId: true },
    });
    if (!child) throw new NotFoundException('ბავშვის პროფილი ვერ მოიძებნა');

    if (role === UserRole.PARENT && child.parentId !== userId) {
      throw new ForbiddenException('ეს პროფილი თქვენი არ არის');
    }

    return this.prisma.milestoneAssessment.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, ageMonths: true, summary: true, hasRedFlag: true, createdAt: true },
    });
  }

  // ─── ადმინი ──────────────────────────────────────────────────────────

  listAll() {
    return this.prisma.milestoneQuestion.findMany({
      where: { deletedAt: null },
      orderBy: [{ ageMonths: 'asc' }, { domain: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createQuestion(dto: CreateQuestionDto, actorId: string) {
    const question = await this.prisma.milestoneQuestion.create({ data: { ...dto } });

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'MilestoneQuestion',
      entityId: question.id,
      after: question,
      description: `კითხვა დაემატა: ${question.code}`,
    });

    return question;
  }

  async updateQuestion(id: string, dto: CreateQuestionDto, actorId: string) {
    const before = await this.findQuestion(id);
    const question = await this.prisma.milestoneQuestion.update({ where: { id }, data: { ...dto } });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'MilestoneQuestion',
      entityId: id,
      before,
      after: question,
    });

    return question;
  }

  /** წაშლა რბილია — შევსებული კითხვარები კითხვაზე მიუთითებენ. */
  async removeQuestion(id: string, actorId: string) {
    const question = await this.findQuestion(id);

    await this.prisma.milestoneQuestion.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'MilestoneQuestion',
      entityId: id,
      before: { code: question.code },
      description: `კითხვა წაშლილია: ${question.code}`,
    });

    return { message: 'კითხვა წაშლილია', id };
  }

  private async findQuestion(id: string) {
    const question = await this.prisma.milestoneQuestion.findFirst({
      where: { id, deletedAt: null },
    });
    if (!question) throw new NotFoundException('კითხვა ვერ მოიძებნა');
    return question;
  }
}

/** სრული თვეები დაბადებიდან. */
function monthsSince(birthDate: Date): number {
  const now = new Date();
  let months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());

  if (now.getDate() < birthDate.getDate()) months -= 1;
  return Math.max(0, months);
}
