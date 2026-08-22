import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, UserRole } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateVaccineDto, MarkVaccinationDto } from './dto/vaccination.dto';

const STAFF_ROLES: UserRole[] = [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN];

/** რამდენ ხანს ითვლება აცრა „ახლოვდება" — ერთი თვე წინასწარ. */
const SOON_DAYS = 30;

export type VaccinationStatus = 'DONE' | 'DUE' | 'SOON' | 'UPCOMING';

@Injectable()
export class VaccinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * ბავშვის კალენდარი.
   *
   * ვადა დაბადების თარიღიდან ითვლება — ცნობარი ასაკს ინახავს და არა
   * თარიღს, თორემ ყოველ ბავშვზე ცალკე ჩანაწერები დაგვჭირდებოდა.
   */
  async calendar(childId: string, userId: string, role: UserRole) {
    const child = await this.assertAccess(childId, userId, role);

    const [vaccines, records] = await Promise.all([
      this.prisma.vaccine.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: [{ ageMonths: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.childVaccination.findMany({ where: { childId } }),
    ]);

    const byVaccine = new Map(records.map((record) => [record.vaccineId, record]));
    const now = Date.now();

    return vaccines.map((vaccine) => {
      const record = byVaccine.get(vaccine.id);
      const dueAt = addMonths(child.birthDate, vaccine.ageMonths);
      const daysLeft = Math.round((dueAt.getTime() - now) / (24 * 60 * 60 * 1000));

      const status: VaccinationStatus = record?.doneAt
        ? 'DONE'
        : daysLeft < 0
          ? 'DUE'
          : daysLeft <= SOON_DAYS
            ? 'SOON'
            : 'UPCOMING';

      return {
        vaccineId: vaccine.id,
        code: vaccine.code,
        name: vaccine.name,
        description: vaccine.description,
        ageMonths: vaccine.ageMonths,
        doseNumber: vaccine.doseNumber,
        dueAt,
        daysLeft,
        status,
        doneAt: record?.doneAt ?? null,
        note: record?.note ?? null,
      };
    });
  }

  /** აცრის მონიშვნა — გაკეთდა ან მონიშვნის მოხსნა. */
  async mark(childId: string, vaccineId: string, dto: MarkVaccinationDto, userId: string, role: UserRole) {
    await this.assertAccess(childId, userId, role);

    const vaccine = await this.prisma.vaccine.findFirst({
      where: { id: vaccineId, deletedAt: null },
      select: { id: true },
    });
    if (!vaccine) throw new NotFoundException('აცრა ვერ მოიძებნა');

    const doneAt = dto.doneAt ? new Date(dto.doneAt) : null;

    return this.prisma.childVaccination.upsert({
      where: { childId_vaccineId: { childId, vaccineId } },
      update: { doneAt, note: dto.note?.trim() || null },
      create: { childId, vaccineId, doneAt, note: dto.note?.trim() || null },
    });
  }

  // ── ცნობარის მართვა ──────────────────────────────────────────────

  listCatalog() {
    return this.prisma.vaccine.findMany({
      where: { deletedAt: null },
      orderBy: [{ ageMonths: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createVaccine(dto: CreateVaccineDto, actorId: string) {
    const vaccine = await this.prisma.vaccine.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        ageMonths: dto.ageMonths,
        doseNumber: dto.doseNumber ?? 1,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'Vaccine',
      entityId: vaccine.id,
      description: `აცრა დაემატა: ${vaccine.name}`,
    });

    return vaccine;
  }

  async removeVaccine(id: string, actorId: string) {
    const vaccine = await this.prisma.vaccine.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!vaccine) throw new NotFoundException('აცრა ვერ მოიძებნა');

    // რბილი წაშლა — ბავშვების ჩანაწერები მასზე მიუთითებს
    await this.prisma.vaccine.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'Vaccine',
      entityId: id,
      description: `აცრა წაიშალა: ${vaccine.name}`,
    });

    return { message: 'აცრა წაშლილია', id };
  }

  private async assertAccess(childId: string, userId: string, role: UserRole) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: { id: true, parentId: true, birthDate: true },
    });
    if (!child) throw new NotFoundException('ბავშვის პროფილი ვერ მოიძებნა');

    if (!STAFF_ROLES.includes(role) && child.parentId !== userId) {
      throw new ForbiddenException('ეს პროფილი თქვენი არ არის');
    }

    return child;
  }
}

/** ვადა დაბადებიდან N თვეში. */
function addMonths(from: Date, months: number): Date {
  const date = new Date(from);
  date.setMonth(date.getMonth() + months);
  return date;
}
