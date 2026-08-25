import { BadRequestException, Injectable } from '@nestjs/common';
import { MedicationDosingType, Prisma } from '@prisma/client';
import {
  calculateDose,
  type Concentration,
  type Medication as DosingMedication,
} from '@askdrteo/dosing';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DIAGNOSIS_SEED } from './diagnoses.seed';

/**
 * დიაგნოზების ცნობარი და დანიშნულების შეთავაზება.
 *
 * ორი რამ აქ ერთდება: ექიმი დიაგნოზს პირველივე ასოებზე პოულობს, და
 * არჩეულ დიაგნოზზე პროგრამა თავად ითვლის დოზებს ბავშვის წონაზე.
 * ექიმს რჩება მთავარი — გადაწყვეტილება; აკრეფა კი პროგრამის საქმეა.
 */
@Injectable()
export class DiagnosesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * შეთავაზება პირველივე ასოებზე.
   *
   * ჯერ ის, რაც სახელის დასაწყისში ემთხვევა, მერე შუაში ნაპოვნი —
   * ექიმი ჩვეულებრივ დასაწყისს კრეფს.
   */
  async suggest(query: string) {
    const q = query.trim();
    if (q.length < 2) return this.frequent();

    const rows = await this.prisma.diagnosisEntry.findMany({
      where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
      take: 8,
      select: { id: true, name: true, description: true, advice: true, usageCount: true },
    });

    const lower = q.toLowerCase();
    return rows.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lower) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(lower) ? 0 : 1;
      return aStarts - bStarts;
    });
  }

  /** ხშირად დასმული — ცარიელ ველზე ესენი ჩნდება. */
  private frequent() {
    return this.prisma.diagnosisEntry.findMany({
      where: { isActive: true },
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
      take: 8,
      select: { id: true, name: true, description: true, advice: true, usageCount: true },
    });
  }

  /**
   * დანიშნულების შეთავაზება.
   *
   * დოზა ბავშვის იმდროინდელ წონასა და ასაკზე ითვლება — სწორედ ამიტომ
   * სთხოვს პროგრამა ექიმს გაზომვებს ვიზიტის დროს.
   */
  async suggestPrescription(diagnosisName: string, weightKg: number, ageMonths: number) {
    const entry = await this.prisma.diagnosisEntry.findFirst({
      where: { name: diagnosisName.trim(), isActive: true },
      include: {
        medications: {
          orderBy: { position: 'asc' },
          include: { medication: true },
        },
      },
    });

    if (!entry) return { description: null, advice: null, items: [] };

    const items = entry.medications.map((link) => {
      const medication = link.medication;
      const concentrations = (medication.concentrations ?? []) as unknown as Concentration[];
      const dose = calculateDose(
        toDosingMedication(medication),
        weightKg,
        ageMonths,
        concentrations[0],
      );

      return {
        medicationId: medication.id,
        name: medication.name,
        note: link.note,
        needsReview: medication.needsReview,
        // დაბლოკილ დოზას ტექსტად ვაბრუნებთ — ექიმმა უნდა დაინახოს, რატომ
        dose: 'blocked' in dose ? null : dose,
        blocked: 'blocked' in dose ? dose.blocked : null,
        concentration: concentrations[0]?.label ?? null,
      };
    });

    return { description: entry.description, advice: entry.advice, items };
  }

  /**
   * დიაგნოზის დამახსოვრება.
   *
   * ექიმის ჩაწერილი ახალი დიაგნოზი ცნობარში რჩება და შემდეგ ჯერზე
   * თავად ამოტივტივდება — ორჯერ ერთი და იმავე ტექსტის კრეფა აღარაა
   * საჭირო.
   */
  async remember(name: string, advice?: string): Promise<void> {
    const clean = name.trim();
    if (clean.length < 3) return;

    await this.prisma.diagnosisEntry.upsert({
      where: { name: clean },
      create: { name: clean, advice: advice?.trim() || null, usageCount: 1 },
      update: { usageCount: { increment: 1 } },
    });
  }

  /**
   * ექიმის დამატებული პრეპარატი.
   *
   * დოზირებას ვერ გამოვიგონებთ — ბავშვის დოზა შემოწმების გარეშე ვერ
   * გავრცელდება. ამიტომ ექიმი მინიმალურ მონაცემებს თავად უთითებს,
   * პრეპარატი კი პედიატრის დადასტურებამდე კალკულატორის საჯარო სიაში
   * არ ჩნდება.
   */
  async addMedication(input: {
    name: string;
    mgPerKgMin: number;
    mgPerKgMax: number;
    intervalHours: number;
    maxDailyMg: number;
    concentrationLabel?: string;
    concentrationMg?: number;
    concentrationMl?: number;
    minAgeMonths?: number;
    minWeightKg?: number;
    note?: string;
    doctorId: string;
  }) {
    const name = input.name.trim();
    if (name.length < 2) throw new BadRequestException('პრეპარატის სახელი ცარიელია');

    if (input.mgPerKgMin <= 0 || input.mgPerKgMax < input.mgPerKgMin) {
      throw new BadRequestException('დოზის დიაპაზონი არასწორია');
    }
    if (input.intervalHours < 1 || input.intervalHours > 24) {
      throw new BadRequestException('ინტერვალი 1-დან 24 საათამდე უნდა იყოს');
    }
    if (input.maxDailyMg <= 0) throw new BadRequestException('დღიური ზღვარი აუცილებელია');

    const concentrations =
      input.concentrationMg && input.concentrationMl
        ? [
            {
              label: input.concentrationLabel ?? `${input.concentrationMg} მგ / ${input.concentrationMl} მლ`,
              mg: input.concentrationMg,
              ml: input.concentrationMl,
            },
          ]
        : [];

    return this.prisma.medication.create({
      data: {
        name,
        slug: slugify(name),
        dosingType: MedicationDosingType.PER_KG,
        mgPerKgMin: input.mgPerKgMin,
        mgPerKgMax: input.mgPerKgMax,
        intervalHoursMin: input.intervalHours,
        intervalHoursMax: input.intervalHours,
        maxDailyMg: input.maxDailyMg,
        minAgeMonths: input.minAgeMonths ?? 0,
        minWeightKg: input.minWeightKg ?? 0,
        concentrations: concentrations as unknown as Prisma.InputJsonValue,
        note: input.note?.trim() || null,
        addedByDoctorId: input.doctorId,
        needsReview: true,
        // საჯარო კალკულატორში დადასტურებამდე არ ჩნდება
        isActive: false,
      },
      select: { id: true, name: true, needsReview: true },
    });
  }

  /** საწყისი ცნობარის ჩატვირთვა — უკვე არსებულს ხელს არ ახლებს. */
  async seed(): Promise<{ created: number }> {
    let created = 0;

    for (const item of DIAGNOSIS_SEED) {
      const entry = await this.prisma.diagnosisEntry.upsert({
        where: { name: item.name },
        create: { name: item.name, advice: item.advice ?? null, isBuiltIn: true },
        update: { advice: item.advice ?? null, isBuiltIn: true },
        select: { id: true },
      });
      created += 1;

      for (const [index, link] of (item.medications ?? []).entries()) {
        const medication = await this.prisma.medication.findUnique({
          where: { slug: link.slug },
          select: { id: true },
        });
        if (!medication) continue;

        await this.prisma.diagnosisMedication.upsert({
          where: {
            diagnosisId_medicationId: {
              diagnosisId: entry.id,
              medicationId: medication.id,
            },
          },
          create: {
            diagnosisId: entry.id,
            medicationId: medication.id,
            note: link.note,
            position: index,
          },
          update: { note: link.note, position: index },
        });
      }
    }

    return { created };
  }
}

/** Prisma-ს ჩანაწერი გამოთვლის პაკეტის ფორმაში. */
function toDosingMedication(medication: {
  id: string;
  slug: string;
  name: string;
  concentrations: unknown;
  dosingType: MedicationDosingType;
  mgPerKgMin: number | null;
  mgPerKgMax: number | null;
  ageBands: unknown;
  intervalHoursMin: number;
  intervalHoursMax: number;
  maxDailyMg: number;
  minAgeMonths: number;
  minWeightKg: number;
}): DosingMedication {
  return {
    id: medication.id,
    slug: medication.slug,
    name: medication.name,
    concentrations: (medication.concentrations ?? []) as Concentration[],
    dosingType: medication.dosingType,
    mgPerKgMin: medication.mgPerKgMin,
    mgPerKgMax: medication.mgPerKgMax,
    ageBands: (medication.ageBands ?? undefined) as DosingMedication['ageBands'],
    intervalHoursMin: medication.intervalHoursMin,
    intervalHoursMax: medication.intervalHoursMax,
    maxDailyMg: medication.maxDailyMg,
    minAgeMonths: medication.minAgeMonths,
    minWeightKg: medication.minWeightKg,
  };
}

/** ლათინური slug — ქართული სახელიდან. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

  // ქართული ასოები slug-ში არ გამოდგება — ასეთ შემთხვევაში ჰეში
  return /^[a-z0-9-]+$/.test(base)
    ? base
    : `med-${Buffer.from(name).toString('hex').slice(0, 12)}`;
}
