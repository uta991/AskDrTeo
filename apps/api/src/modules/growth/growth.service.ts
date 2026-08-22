import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateGrowthEntryDto } from './dto/growth.dto';

const STAFF_ROLES: UserRole[] = [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN];

export interface GrowthPoint {
  id: string;
  measuredAt: Date;
  ageMonths: number;
  weightKg: number | null;
  heightCm: number | null;
  headCm: number | null;
  note: string | null;
}

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ბავშვის გაზომვები ასაკით.
   *
   * პროცენტილს არ ვთვლით — ეს პედიატრის შეფასებაა. მშობელს საკუთარი
   * მრუდი ვაჩვენებთ, რომ ტენდენცია დაინახოს.
   */
  async list(childId: string, userId: string, role: UserRole): Promise<GrowthPoint[]> {
    const child = await this.assertAccess(childId, userId, role);

    const entries = await this.prisma.growthEntry.findMany({
      where: { childId, deletedAt: null },
      orderBy: { measuredAt: 'asc' },
      take: 200,
    });

    return entries.map((entry) => ({
      id: entry.id,
      measuredAt: entry.measuredAt,
      ageMonths: monthsBetween(child.birthDate, entry.measuredAt),
      weightKg: entry.weightKg ? Number(entry.weightKg) : null,
      heightCm: entry.heightCm ? Number(entry.heightCm) : null,
      headCm: entry.headCm ? Number(entry.headCm) : null,
      note: entry.note,
    }));
  }

  async create(childId: string, dto: CreateGrowthEntryDto, userId: string, role: UserRole) {
    const child = await this.assertAccess(childId, userId, role);

    if (!dto.weightKg && !dto.heightCm && !dto.headCm) {
      throw new BadRequestException('შეიყვანეთ ერთი მაინც: წონა, სიმაღლე ან თავის გარშემოწერილობა');
    }

    const measuredAt = new Date(dto.measuredAt);
    if (measuredAt < child.birthDate) {
      throw new BadRequestException('გაზომვის თარიღი დაბადებამდეა');
    }
    if (measuredAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      throw new BadRequestException('გაზომვის თარიღი მომავალშია');
    }

    return this.prisma.growthEntry.create({
      data: {
        childId,
        measuredAt,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        headCm: dto.headCm,
        note: dto.note?.trim() || null,
      },
    });
  }

  async remove(entryId: string, userId: string, role: UserRole) {
    const entry = await this.prisma.growthEntry.findFirst({
      where: { id: entryId, deletedAt: null },
      select: { id: true, childId: true },
    });
    if (!entry) throw new NotFoundException('ჩანაწერი ვერ მოიძებნა');

    await this.assertAccess(entry.childId, userId, role);

    await this.prisma.growthEntry.update({
      where: { id: entryId },
      data: { deletedAt: new Date() },
    });

    return { message: 'ჩანაწერი წაშლილია', id: entryId };
  }

  private async assertAccess(childId: string, userId: string, role: UserRole) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: { id: true, parentId: true, birthDate: true },
    });
    if (!child) throw new NotFoundException('ბავშვის პროფილი ვერ მოიძებნა');

    // პერსონალს კონსულტაციისთვის სჭირდება; მშობელი მხოლოდ თავისას ხედავს
    if (!STAFF_ROLES.includes(role) && child.parentId !== userId) {
      throw new ForbiddenException('ეს პროფილი თქვენი არ არის');
    }

    return child;
  }
}

/** ასაკი თვეებში — გრაფიკის ჰორიზონტალური ღერძი. */
function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
}
