import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, MedicationDosingType, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMedicationDto, UpdateMedicationDto } from './dto/medication.dto';

@Injectable()
export class MedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** კალკულატორის ცნობარი — მხოლოდ აქტიური წამლები. */
  listActive() {
    return this.prisma.medication.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** ადმინის სია — გამორთულებიც ჩანს. */
  listAll() {
    return this.prisma.medication.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateMedicationDto, actorId: string) {
    this.assertConsistent(dto);

    const exists = await this.prisma.medication.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException(`იდენტიფიკატორი "${dto.slug}" უკვე გამოყენებულია`);

    const medication = await this.prisma.medication.create({ data: this.toData(dto) });

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'Medication',
      entityId: medication.id,
      after: medication,
      description: `წამალი დაემატა: ${medication.name}`,
    });

    return medication;
  }

  async update(id: string, dto: UpdateMedicationDto, actorId: string) {
    this.assertConsistent(dto);

    const before = await this.findOne(id);

    const medication = await this.prisma.medication.update({
      where: { id },
      data: { ...this.toData(dto), isActive: dto.isActive ?? before.isActive },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'Medication',
      entityId: id,
      before,
      after: medication,
      description: `წამალი შეიცვალა: ${medication.name}`,
    });

    return medication;
  }

  /**
   * წაშლა რბილია.
   *
   * გამოთვლების ისტორია და ცვლილებების ჟურნალი წამალზე მიუთითებს —
   * ჩანაწერის ფიზიკური წაშლა მათ გაწყვეტდა.
   */
  async remove(id: string, actorId: string) {
    const medication = await this.findOne(id);

    await this.prisma.medication.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'Medication',
      entityId: id,
      before: { name: medication.name },
      description: `წამალი წაშლილია: ${medication.name}`,
    });

    return { message: 'წამალი წაშლილია', id };
  }

  private async findOne(id: string) {
    const medication = await this.prisma.medication.findFirst({
      where: { id, deletedAt: null },
    });
    if (!medication) throw new NotFoundException('წამალი ვერ მოიძებნა');
    return medication;
  }

  /**
   * წესის მთლიანობა.
   *
   * ეს შემოწმება აქ არის და არა DTO-ში, რადგან ველების სავალდებულოობა
   * ერთმანეთზეა დამოკიდებული — მარტო დეკორატორებით ვერ აღიწერება.
   */
  private assertConsistent(dto: CreateMedicationDto): void {
    if (dto.intervalHoursMin > dto.intervalHoursMax) {
      throw new BadRequestException('ინტერვალის მინიმუმი მაქსიმუმზე მეტია');
    }

    if (!dto.concentrations.length) {
      throw new BadRequestException('მიუთითეთ მინიმუმ ერთი კონცენტრაცია');
    }

    if (dto.dosingType === MedicationDosingType.PER_KG) {
      if (!dto.mgPerKgMin || !dto.mgPerKgMax) {
        throw new BadRequestException('წონაზე დოზირებას მგ/კგ სჭირდება');
      }
      if (dto.mgPerKgMin > dto.mgPerKgMax) {
        throw new BadRequestException('მგ/კგ მინიმუმი მაქსიმუმზე მეტია');
      }
      return;
    }

    if (!dto.ageBands?.length) {
      throw new BadRequestException('ასაკობრივ დოზირებას საფეხურები სჭირდება');
    }

    // საფეხურები ზრდადი უნდა იყოს — თორემ ძებნა პირველივეზე გაჩერდება
    const sorted = [...dto.ageBands].sort((a, b) => a.untilMonths - b.untilMonths);
    if (sorted.some((band, i) => i > 0 && band.untilMonths === sorted[i - 1].untilMonths)) {
      throw new BadRequestException('ასაკობრივი საფეხურები ერთმანეთს ემთხვევა');
    }
  }

  private toData(dto: CreateMedicationDto): Prisma.MedicationUncheckedCreateInput {
    const perKg = dto.dosingType === MedicationDosingType.PER_KG;

    return {
      name: dto.name.trim(),
      slug: dto.slug.trim().toLowerCase(),
      dosingType: dto.dosingType,
      // მეორე წესის ველები ინულება, თორემ ტიპის შეცვლისას ძველი
      // მნიშვნელობები ჩუმად შემორჩებოდა
      mgPerKgMin: perKg ? dto.mgPerKgMin : null,
      mgPerKgMax: perKg ? dto.mgPerKgMax : null,
      ageBands: perKg
        ? Prisma.DbNull
        : ([...(dto.ageBands ?? [])].sort((a, b) => a.untilMonths - b.untilMonths) as object[]),
      intervalHoursMin: dto.intervalHoursMin,
      intervalHoursMax: dto.intervalHoursMax,
      maxDailyMg: dto.maxDailyMg,
      minAgeMonths: dto.minAgeMonths ?? 0,
      minWeightKg: dto.minWeightKg ?? 0,
      concentrations: dto.concentrations as object[],
      note: dto.note?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
    };
  }
}
