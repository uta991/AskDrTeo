import { Injectable } from '@nestjs/common';
import { MilestoneDomain, UserRole } from '@prisma/client';
import { calculateDose, type Medication as DosingMedication } from '@askdrteo/dosing';
import { DOMAIN_LABELS, questionsForAge, type Question } from '@askdrteo/milestones';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * ასისტენტის ინსტრუმენტები.
 *
 * პრინციპი ერთია: **ციფრი და ფაქტი ჩვენი ბაზიდან მოდის, არა მოდელის
 * მეხსიერებიდან.** მოდელი წყვეტს, რომელი ინსტრუმენტი გამოიძახოს და
 * როგორ ჩამოაყალიბოს პასუხი; დოზა, აცრის ვადა, ასაკობრივი ეტაპი და
 * ბავშვის მონაცემები კი იმ კოდიდან და ცნობარიდან ამოდის, რომელსაც
 * ექიმი რედაქტირებს და რომელზეც კალკულატორიც მუშაობს.
 */

export interface ToolContext {
  userId: string;
  role: UserRole;
}

/** Anthropic-ის ფორმატში აღწერილი ინსტრუმენტები. */
export const AI_TOOLS = [
  {
    name: 'list_medications',
    description:
      'ცნობარში არსებული წამლების სია. გამოიძახე მაშინ, როცა მშობელი წამალს ასახელებს ' +
      'ან გაინტერესებს, რომელი წამლები გვაქვს.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'calculate_dose',
    description:
      'დოზის გამოთვლა ცნობარის მიხედვით. დოზას შენ არასდროს თვლი — ეს ინსტრუმენტი ' +
      'იმავე კოდით ითვლის, რითიც აპლიკაციის კალკულატორი. საჭიროა წამლის სახელი, ' +
      'ბავშვის წონა კილოგრამებში და ასაკი თვეებში. თუ წონა ან ასაკი არ იცი, ჯერ ჰკითხე მშობელს.',
    input_schema: {
      type: 'object',
      properties: {
        medication: { type: 'string', description: 'წამლის სახელი ან slug' },
        weightKg: { type: 'number', description: 'ბავშვის წონა კილოგრამებში' },
        ageMonths: { type: 'number', description: 'ბავშვის ასაკი თვეებში' },
      },
      required: ['medication', 'weightKg', 'ageMonths'],
    },
  },
  {
    name: 'child_profiles',
    description:
      'მშობლის ბავშვების პროფილები: სახელი, ასაკი თვეებში, ნაადრევობა და ბოლო გაზომვები ' +
      '(წონა, სიმაღლე). გამოიძახე, როცა პასუხი ასაკზეა დამოკიდებული.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'vaccination_status',
    description:
      'ბავშვის აცრების კალენდარი ჩვენი ცნობარიდან: რომელი აცრა გაკეთდა, რომელს ' +
      'გადასცდა ვადა და რომელი ახლოვდება. აცრების ვადებს შენით არ ასახელებ.',
    input_schema: {
      type: 'object',
      properties: { childName: { type: 'string', description: 'ბავშვის სახელი, თუ რამდენიმეა' } },
      required: [],
    },
  },
  {
    name: 'milestones_for_age',
    description:
      'ასაკობრივი ეტაპის კითხვები ჩვენი კითხვარიდან — რას უნდა აკეთებდეს ბავშვი ამ ასაკში. ' +
      'განვითარებაზე პასუხისას ამას ეყრდნობი და არა მეხსიერებას.',
    input_schema: {
      type: 'object',
      properties: { ageMonths: { type: 'number', description: 'ასაკი თვეებში' } },
      required: ['ageMonths'],
    },
  },
  {
    name: 'app_features',
    description:
      'რა შედის რომელ პაკეტში და სად რა ფუნქციაა აპლიკაციაში. გამოიძახე, როცა მშობელი ' +
      'კითხულობს, რა შეუძლია აპლიკაციაში ან რა სჭირდება პაკეტის ასაღებად.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'search_content',
    description:
      'დოქტორ თეოს სიახლეები და ვიდეოები სათაურით. თუ თემაზე მასალა გვაქვს, პასუხში ახსენებ.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'საძიებო სიტყვა' } },
      required: ['query'],
    },
  },
] as const;

@Injectable()
export class AiToolsService {
  constructor(private readonly prisma: PrismaService) {}

  /** ინსტრუმენტის შესრულება. შედეგი მოდელს ტექსტად უბრუნდება. */
  async run(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
    switch (name) {
      case 'list_medications':
        return this.listMedications();

      case 'calculate_dose':
        return this.dose(
          String(input.medication ?? ''),
          Number(input.weightKg),
          Number(input.ageMonths),
        );

      case 'child_profiles':
        return this.children(ctx.userId);

      case 'vaccination_status':
        return this.vaccinations(ctx.userId, input.childName ? String(input.childName) : undefined);

      case 'milestones_for_age':
        return this.milestones(Number(input.ageMonths));

      case 'app_features':
        return this.features();

      case 'search_content':
        return this.content(String(input.query ?? ''));

      default:
        return { error: 'უცნობი ინსტრუმენტი' };
    }
  }

  private async listMedications() {
    const medications = await this.prisma.medication.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true, minAgeMonths: true, note: true },
    });

    return { medications };
  }

  /**
   * დოზა — იმავე ფუნქციით, რითიც კალკულატორი.
   *
   * მოდელს მხოლოდ შედეგი მიდის; ფორმულა და ზღვრები საერთო პაკეტშია.
   */
  private async dose(query: string, weightKg: number, ageMonths: number) {
    if (!Number.isFinite(weightKg) || !Number.isFinite(ageMonths)) {
      return { error: 'საჭიროა წონა კილოგრამებში და ასაკი თვეებში' };
    }

    const needle = query.trim().toLowerCase();
    const all = await this.prisma.medication.findMany({
      where: { isActive: true, deletedAt: null },
    });

    const medication =
      all.find((row) => row.slug.toLowerCase() === needle) ??
      all.find((row) => row.name.toLowerCase().includes(needle)) ??
      null;

    if (!medication) {
      return {
        error: 'ეს წამალი ცნობარში არ არის',
        available: all.map((row) => row.name),
      };
    }

    // Json ველები Prisma-სთვის უტიპოა — ცნობარის ფორმა ერთადერთ პაკეტშია აღწერილი
    const shaped = {
      ...medication,
      ageBands: (medication.ageBands ?? null) as unknown as DosingMedication['ageBands'],
      concentrations: (medication.concentrations ??
        []) as unknown as DosingMedication['concentrations'],
    } as unknown as DosingMedication;

    const result = calculateDose(shaped, weightKg, ageMonths, shaped.concentrations?.[0]);

    return {
      medication: medication.name,
      note: medication.note,
      concentration: shaped.concentrations?.[0]?.label ?? null,
      intervalHours: [medication.intervalHoursMin, medication.intervalHoursMax],
      result,
      reminder: 'ეს ცნობარის გამოთვლაა და არა დანიშნულება — შემთხვევა ექიმმა უნდა შეაფასოს.',
    };
  }

  private async children(userId: string) {
    const children = await this.prisma.child.findMany({
      where: { parentId: userId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        birthDate: true,
        gender: true,
        gestationalWeek: true,
        growthEntries: {
          where: { deletedAt: null },
          orderBy: { measuredAt: 'desc' },
          take: 1,
          select: { measuredAt: true, weightKg: true, heightCm: true },
        },
      },
    });

    return {
      children: children.map((child) => ({
        name: child.firstName,
        ageMonths: monthsSince(child.birthDate),
        isPreterm: !!child.gestationalWeek && child.gestationalWeek < 37,
        gestationalWeek: child.gestationalWeek,
        latestMeasurement: child.growthEntries[0]
          ? {
              date: child.growthEntries[0].measuredAt.toISOString().slice(0, 10),
              weightKg: Number(child.growthEntries[0].weightKg ?? 0) || null,
              heightCm: Number(child.growthEntries[0].heightCm ?? 0) || null,
            }
          : null,
      })),
    };
  }

  private async vaccinations(userId: string, childName?: string) {
    const child = await this.prisma.child.findFirst({
      where: {
        parentId: userId,
        deletedAt: null,
        ...(childName ? { firstName: { contains: childName, mode: 'insensitive' } } : {}),
      },
      select: {
        firstName: true,
        birthDate: true,
        vaccinations: { select: { vaccineId: true, doneAt: true } },
      },
    });
    if (!child) return { error: 'ბავშვის პროფილი ვერ მოიძებნა' };

    const vaccines = await this.prisma.vaccine.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ ageMonths: 'asc' }, { sortOrder: 'asc' }],
    });

    const done = new Map(child.vaccinations.map((row) => [row.vaccineId, row.doneAt]));
    const age = monthsSince(child.birthDate);

    return {
      child: child.firstName,
      ageMonths: age,
      done: vaccines.filter((v) => done.get(v.id)).map((v) => v.name),
      overdue: vaccines
        .filter((v) => !done.get(v.id) && v.ageMonths <= age)
        .map((v) => ({ name: v.name, ageMonths: v.ageMonths })),
      upcoming: vaccines
        .filter((v) => !done.get(v.id) && v.ageMonths > age)
        .slice(0, 5)
        .map((v) => ({ name: v.name, ageMonths: v.ageMonths })),
    };
  }

  private async milestones(ageMonths: number) {
    if (!Number.isFinite(ageMonths)) return { error: 'საჭიროა ასაკი თვეებში' };

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

    const selected = questionsForAge(all as unknown as Question[], ageMonths);
    if (!selected.length) return { error: 'ამ ასაკზე კითხვარი არ გვაქვს' };

    const byDomain: Record<string, string[]> = {};
    for (const question of selected) {
      const label = DOMAIN_LABELS[question.domain as MilestoneDomain] ?? question.domain;
      (byDomain[label] ??= []).push(question.questionKa);
    }

    return { stageMonths: selected[0].ageMonths, byDomain };
  }

  private async features() {
    const plans = await this.prisma.plan.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        code: true,
        name: true,
        description: true,
        prices: { select: { amountMinor: true, interval: true, currency: true } },
        features: {
          where: { enabled: true, feature: { isActive: true, isPublic: true } },
          select: { value: true, feature: { select: { name: true } } },
        },
      },
    });

    return {
      plans: plans.map((plan) => ({
        name: plan.name,
        description: plan.description,
        prices: plan.prices.map((price) => `${price.amountMinor / 100} ${price.currency}/${price.interval}`),
        features: plan.features.map((row) =>
          row.value ? `${row.feature.name}: ${row.value}` : row.feature.name,
        ),
      })),
      whereToFind: {
        'დოზის კალკულატორი': 'მენიუ → კალკულატორი',
        'განვითარების მონიტორინგი': 'მენიუ → განვითარება',
        'ზრდის დღიური': 'პროფილი → ზრდის დღიური',
        'აცრების კალენდარი': 'პროფილი → აცრების კალენდარი',
        'ჩატი კონსულტანტთან': 'პროფილი → ჩატი',
        'ვიზიტის ჯავშანი': 'პროფილი → ვიზიტის ჯავშანი',
      },
    };
  }

  private async content(query: string) {
    const needle = query.trim();
    if (!needle) return { items: [] };

    const [news, videos] = await Promise.all([
      this.prisma.newsPost.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          OR: [
            { title: { contains: needle, mode: 'insensitive' } },
            { body: { contains: needle, mode: 'insensitive' } },
          ],
        },
        take: 3,
        select: { title: true, publishedAt: true },
      }),
      this.prisma.video.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          title: { contains: needle, mode: 'insensitive' },
        },
        take: 3,
        select: { title: true, slug: true },
      }),
    ]);

    return {
      news: news.map((row) => row.title),
      videos: videos.map((row) => ({ title: row.title, path: `/videos/${row.slug}` })),
    };
  }
}

/** ასაკი თვეებში დაბადების თარიღიდან. */
function monthsSince(birthDate: Date): number {
  return Math.max(
    0,
    Math.floor((Date.now() - birthDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)),
  );
}
