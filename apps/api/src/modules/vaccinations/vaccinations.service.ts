import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditAction, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';
import { CreateVaccineDto, MarkVaccinationDto, SaveHistoryDto } from './dto/vaccination.dto';

const STAFF_ROLES: UserRole[] = [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN];

/** რამდენ ხანს ითვლება აცრა „ახლოვდება" — ერთი თვე წინასწარ. */
const SOON_DAYS = 30;

/** შეხსენება სამი თვით ადრე — ვიზიტის დაჯავშნას დრო სჭირდება. */
const REMINDER_MONTHS = 3;

/** ერთ SMS-ში რამდენი აცრა ჩამოვთვალოთ — გრძელი ტექსტი ორ SMS-ად იშლება. */
const SMS_LIST_LIMIT = 4;

export type VaccinationStatus = 'DONE' | 'DUE' | 'SOON' | 'UPCOMING';

@Injectable()
export class VaccinationsService {
  private readonly logger = new Logger(VaccinationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationsService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
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


  /**
   * ისტორიის შესავსები სია.
   *
   * მხოლოდ ის აცრები, რომლებიც ამ ასაკში უკვე უნდა ჰქონდეს — მომავალი
   * აცრების მონიშვნას აზრი არ აქვს და მშობელს მხოლოდ დააბნევდა.
   */
  async pendingHistory(childId: string, userId: string, role: UserRole) {
    const rows = await this.calendar(childId, userId, role);
    return rows.filter((row) => row.status === 'DUE' || row.status === 'DONE');
  }

  /**
   * ისტორიის შენახვა.
   *
   * შენახვის შემდეგ მშობელს SMS-ით მიდის, რომელი აცრა დარჩა და
   * ვიზიტის დაჯავშნის ბმული — თორემ ჩამონათვალი აპლიკაციაში დარჩებოდა.
   */
  async saveHistory(childId: string, dto: SaveHistoryDto, userId: string, role: UserRole) {
    const child = await this.assertAccess(childId, userId, role);
    const rows = await this.pendingHistory(childId, userId, role);

    const done = new Set(dto.doneVaccineIds);
    const now = new Date();

    for (const row of rows) {
      await this.prisma.childVaccination.upsert({
        where: { childId_vaccineId: { childId, vaccineId: row.vaccineId } },
        update: { doneAt: done.has(row.vaccineId) ? (row.doneAt ?? now) : null },
        create: {
          childId,
          vaccineId: row.vaccineId,
          doneAt: done.has(row.vaccineId) ? now : null,
        },
      });
    }

    await this.prisma.child.update({
      where: { id: childId },
      data: { vaccinationHistoryAt: now },
    });

    const missing = rows.filter((row) => !done.has(row.vaccineId));
    if (missing.length) {
      await this.tellParent(
        child.parentId,
        'აცრები, რომლებიც დაგრჩათ',
        `${child.firstName}: დაგრჩენიათ ${this.nameList(missing.map((row) => row.name))}. ` +
          `ვიზიტის დასაჯავშნად: ${this.bookingUrl()}`,
      );
    }

    return { saved: rows.length, missing: missing.length };
  }

  /**
   * მოახლოებული აცრების შეხსენება.
   *
   * დღეში ერთხელ: სამ თვეში დასადგარ აცრაზე მშობელს შეტყობინება და
   * SMS მიდის. `reminderSentAt` იცავს გამეორებისგან — ერთი აცრა
   * ერთხელ უნდა შეგვახსენებინოს.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendUpcomingReminders(): Promise<number> {
    const [vaccines, children] = await Promise.all([
      this.prisma.vaccine.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, ageMonths: true },
      }),
      this.prisma.child.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          firstName: true,
          birthDate: true,
          parentId: true,
          vaccinations: { select: { vaccineId: true, doneAt: true, reminderSentAt: true } },
        },
      }),
    ]);

    const now = new Date();
    // ზღვარი კალენდარულ თვეებში და არა 90 დღეში — თორემ ზუსტად სამ თვეზე
    // დამთხვევა ერთი-ორი დღით გვცდებოდა
    const horizon = addMonths(now, REMINDER_MONTHS);
    let sent = 0;

    for (const child of children) {
      // კალენდარი ფასიან პაკეტშია — უფასოზე შეხსენებაც არ მიდის
      if (!(await this.entitlements.can(child.parentId, 'vaccination_calendar'))) continue;

      const records = new Map(child.vaccinations.map((row) => [row.vaccineId, row]));

      const due = vaccines.filter((vaccine) => {
        const record = records.get(vaccine.id);
        if (record?.doneAt || record?.reminderSentAt) return false;

        const dueAt = addMonths(child.birthDate, vaccine.ageMonths);
        return dueAt > now && dueAt <= horizon;
      });

      if (!due.length) continue;

      for (const vaccine of due) {
        await this.prisma.childVaccination.upsert({
          where: { childId_vaccineId: { childId: child.id, vaccineId: vaccine.id } },
          update: { reminderSentAt: new Date() },
          create: { childId: child.id, vaccineId: vaccine.id, reminderSentAt: new Date() },
        });
      }

      await this.tellParent(
        child.parentId,
        'მოახლოებული აცრა',
        `${child.firstName}-ს უახლოეს თვეებში ${this.nameList(due.map((v) => v.name))} ` +
          `უნდა გაუკეთდეს. გთხოვთ, დაჯავშნოთ ვიზიტი: ${this.bookingUrl()}`,
      );

      sent += 1;
    }

    if (sent) this.logger.log(`აცრის შეხსენება გაეგზავნა ${sent} მშობელს`);
    return sent;
  }

  /**
   * პაკეტის გააქტიურებისას — ისტორიის შევსების თხოვნა.
   *
   * გამოწერის მიმნიჭებელი კოდი ამას იძახებს; შევსებულ პროფილზე
   * შეტყობინება აღარ მეორდება.
   */
  async promptHistory(userId: string): Promise<void> {
    if (!(await this.entitlements.can(userId, 'vaccination_calendar'))) return;

    const children = await this.prisma.child.findMany({
      where: { parentId: userId, deletedAt: null, vaccinationHistoryAt: null },
      select: { id: true, firstName: true },
    });
    if (!children.length) return;

    await this.notifications.push({
      userId,
      title: 'შეავსეთ აცრების ისტორია',
      body:
        children.length === 1
          ? `მონიშნეთ, რომელი აცრები აქვს ${children[0].firstName}-ს გაკეთებული`
          : 'მონიშნეთ, რომელი აცრები აქვთ თქვენს ბავშვებს გაკეთებული',
      data: { vaccinationHistory: true } as Prisma.InputJsonValue,
    });
  }

  /** შეტყობინება და SMS ერთად — SMS-ის ჩავარდნა დანარჩენს არ აჩერებს. */
  private async tellParent(userId: string, title: string, body: string): Promise<void> {
    await this.notifications.push({
      userId,
      title,
      body,
      data: { vaccinations: true } as Prisma.InputJsonValue,
    });

    const parent = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!parent?.phone) return;

    await this.sms
      .send({ userId, phone: parent.phone, body, templateKey: 'vaccination' })
      .catch((error: unknown) => {
        this.logger.warn(`აცრის SMS ვერ გაიგზავნა: ${String(error)}`);
      });
  }

  /** ჩამონათვალი ტექსტში — გრძელი სია SMS-ს ორად ყოფს. */
  private nameList(names: string[]): string {
    if (names.length <= SMS_LIST_LIMIT) return names.join(', ');
    return `${names.slice(0, SMS_LIST_LIMIT).join(', ')} და კიდევ ${names.length - SMS_LIST_LIMIT}`;
  }

  private bookingUrl(): string {
    return `${this.config.get<string>('webUrl')}/booking`;
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
      select: { id: true, parentId: true, birthDate: true, firstName: true },
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
