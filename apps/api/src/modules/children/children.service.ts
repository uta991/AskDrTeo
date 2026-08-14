import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Child, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { CreateChildDto, UpdateChildDto } from './dto/child.dto';
import { correctedAgeMonths, resolveAgeStage, type AgeStageKey } from './age-stage';

const MAX_CHILDREN_FEATURE = 'max_children';

/** მშობლის ველები, რომლებიც პერსონალს ჩანს — პაროლი და სესიები არასდროს. */
const PARENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
} satisfies Prisma.UserSelect;

export interface ChildView {
  id: string;
  firstName: string;
  lastName: string | null;
  birthDate: Date;
  gender: string;
  avatarUrl: string | null;
  gestationalWeek: number | null;
  birthWeight: number | null;
  birthHeight: number | null;
  motherFirstName: string | null;
  motherLastName: string | null;
  motherBirthDate: Date | null;
  fatherFirstName: string | null;
  fatherLastName: string | null;
  fatherBirthDate: Date | null;
  /** მიმდინარე ასაკი თვეებში — აპლიკაცია ამით არჩევს რელევანტურ კონტენტს */
  ageMonths: number;
  ageLabel: string;
  /** ნაადრევად დაბადებულისთვის კორექტირებული ასაკი */
  correctedAgeMonths: number;
  /** ასაკობრივი ეტაპი — ამის მიხედვით ჩნდება საჭიროებების სია */
  stage: AgeStageKey;
  /** true, თუ კორექცია რეალურად გამოიყენება (ნაადრევი, 24 თვემდე) */
  isPreterm: boolean;
}

@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async list(parentId: string): Promise<ChildView[]> {
    const children = await this.prisma.child.findMany({
      where: { parentId, deletedAt: null },
      orderBy: { birthDate: 'desc' },
    });

    return children.map((child) => this.toView(child));
  }

  /** პერსონალის ხედი — ბავშვი მშობლის საკონტაქტოსთან ერთად. */
  async listAll(query: {
    search?: string;
    birthDate?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;

    const where: Prisma.ChildWhereInput = {
      deletedAt: null,
      ...(query.search ? { OR: buildSearchFilters(query.search) } : {}),
      ...(query.birthDate ? { birthDate: dayRange(query.birthDate) } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.child.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { parent: { select: PARENT_SELECT } },
      }),
      this.prisma.child.count({ where }),
    ]);

    const items = rows.map(({ parent, ...child }) => ({
      ...this.toView(child),
      parent,
    }));

    return { items, total, page, perPage, pages: Math.ceil(total / perPage) };
  }

  async findForStaff(id: string) {
    const child = await this.prisma.child.findFirst({
      where: { id, deletedAt: null },
      include: { parent: { select: PARENT_SELECT } },
    });
    if (!child) throw new NotFoundException('პროფილი ვერ მოიძებნა');

    const { parent, ...rest } = child;
    return { ...this.toView(rest), parent };
  }

  async create(parentId: string, dto: CreateChildDto): Promise<ChildView> {
    const current = await this.prisma.child.count({
      where: { parentId, deletedAt: null },
    });

    // ლიმიტი პაკეტიდან მოდის, კოდში ჩაწერილი რიცხვი არსად არის
    if (!(await this.entitlements.withinLimit(parentId, MAX_CHILDREN_FEATURE, current))) {
      const max = await this.entitlements.limit(parentId, MAX_CHILDREN_FEATURE);
      throw new ForbiddenException({
        message: `თქვენს პაკეტში ${max} ბავშვის პროფილი შედის`,
        requiredFeature: MAX_CHILDREN_FEATURE,
        upgradeRequired: true,
      });
    }

    const child = await this.prisma.child.create({
      data: {
        parentId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName?.trim(),
        birthDate: dto.birthDate,
        gender: dto.gender,
        avatarUrl: dto.avatarUrl,
        gestationalWeek: dto.gestationalWeek,
        birthWeight: dto.birthWeight ? new Prisma.Decimal(dto.birthWeight) : null,
        birthHeight: dto.birthHeight ? new Prisma.Decimal(dto.birthHeight) : null,
        motherFirstName: dto.motherFirstName?.trim(),
        motherLastName: dto.motherLastName?.trim(),
        motherBirthDate: dto.motherBirthDate,
        fatherFirstName: dto.fatherFirstName?.trim(),
        fatherLastName: dto.fatherLastName?.trim(),
        fatherBirthDate: dto.fatherBirthDate,
        notes: dto.notes,
      },
    });

    return this.toView(child);
  }

  async update(parentId: string, id: string, dto: UpdateChildDto): Promise<ChildView> {
    await this.assertOwnership(parentId, id);

    const child = await this.prisma.child.update({
      where: { id },
      data: {
        ...dto,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        birthWeight: dto.birthWeight ? new Prisma.Decimal(dto.birthWeight) : undefined,
        birthHeight: dto.birthHeight ? new Prisma.Decimal(dto.birthHeight) : undefined,
      },
    });

    return this.toView(child);
  }

  /** რბილი წაშლა — ზრდის ისტორია და ნახვები ბავშვს უკავშირდება. */
  async remove(parentId: string, id: string): Promise<{ message: string }> {
    await this.assertOwnership(parentId, id);

    await this.prisma.child.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'პროფილი წაშლილია' };
  }

  private async assertOwnership(parentId: string, id: string): Promise<void> {
    const child = await this.prisma.child.findFirst({
      where: { id, parentId, deletedAt: null },
    });
    // „ვერ მოიძებნა" და არა „უფლება არ გაქვთ" — სხვისი ID-ების არსებობას არ ვამხელთ
    if (!child) throw new NotFoundException('პროფილი ვერ მოიძებნა');
  }

  private toView(child: Child): ChildView {
    const ageMonths = this.monthsSince(child.birthDate);
    const corrected = correctedAgeMonths(ageMonths, child.gestationalWeek);

    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      gender: child.gender,
      avatarUrl: child.avatarUrl,
      gestationalWeek: child.gestationalWeek,
      birthWeight: child.birthWeight ? Number(child.birthWeight) : null,
      birthHeight: child.birthHeight ? Number(child.birthHeight) : null,
      motherFirstName: child.motherFirstName,
      motherLastName: child.motherLastName,
      motherBirthDate: child.motherBirthDate,
      fatherFirstName: child.fatherFirstName,
      fatherLastName: child.fatherLastName,
      fatherBirthDate: child.fatherBirthDate,
      ageMonths,
      ageLabel: this.formatAge(ageMonths),
      correctedAgeMonths: corrected,
      // ეტაპს კორექტირებული ასაკით ვარჩევთ — ნაადრევად დაბადებულს
      // კალენდარული ასაკის კონტენტი ნაადრევად მიეწოდებოდა
      stage: resolveAgeStage(corrected),
      isPreterm: corrected !== ageMonths,
    };
  }

  private monthsSince(date: Date): number {
    const now = new Date();
    let months =
      (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());

    // თუ თვის რიცხვამდე ჯერ არ მიგვიღწევია, სრული თვე არ შესრულებულა
    if (now.getDate() < date.getDate()) months -= 1;
    return Math.max(0, months);
  }

  private formatAge(months: number): string {
    if (months < 1) return 'ახალშობილი';
    if (months < 12) return `${months} თვის`;

    const years = Math.floor(months / 12);
    const rest = months % 12;
    return rest === 0 ? `${years} წლის` : `${years} წლის და ${rest} თვის`;
  }
}

/**
 * ძებნის ველები.
 *
 * მშობლის სახელი ორ ადგილას ინახება: ბავშვის ბარათში (დედა/მამა ცალ-ცალკე)
 * და ანგარიშზე. ორივეს ვამოწმებთ — ოპერატორმა შეიძლება ერთი იცოდეს და
 * მეორე არა.
 */
function buildSearchFilters(search: string): Prisma.ChildWhereInput[] {
  const like = { contains: search, mode: 'insensitive' as const };

  return [
    { firstName: like },
    { lastName: like },
    { motherFirstName: like },
    { motherLastName: like },
    { fatherFirstName: like },
    { fatherLastName: like },
    { parent: { firstName: like } },
    { parent: { lastName: like } },
    { parent: { email: like } },
    // ტელეფონი E.164-შია (+995...), მომხმარებელი კი ხშირად პრეფიქსის
    // გარეშე ეძებს — `contains` ორივე ვარიანტს იჭერს
    { parent: { phone: { contains: search.replace(/[^\d+]/g, '') } } },
  ];
}

/** ერთი დღის დიაპაზონი — თარიღი დროსთან ერთად ინახება. */
function dayRange(isoDate: string): Prisma.DateTimeFilter {
  const start = new Date(isoDate);
  if (Number.isNaN(start.getTime())) {
    throw new BadRequestException('დაბადების თარიღი არასწორია');
  }

  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { gte: start, lt: end };
}
