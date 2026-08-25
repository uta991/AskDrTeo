import { PrismaClient } from '@prisma/client';
import { DIAGNOSIS_SEED } from '../src/modules/video-visits/diagnoses.seed';

/**
 * დიაგნოზების საწყისი ცნობარი.
 *
 * ხელახლა გაშვება უსაფრთხოა — არსებულ ჩანაწერს მხოლოდ რჩევას
 * განაახლებს და ექიმის დამატებულებს ხელს არ ახლებს.
 */
export async function seedDiagnoses(prisma: PrismaClient): Promise<void> {
  let linked = 0;

  for (const item of DIAGNOSIS_SEED) {
    const entry = await prisma.diagnosisEntry.upsert({
      where: { name: item.name },
      create: {
        name: item.name,
        description: item.description ?? null,
        advice: item.advice ?? null,
        isBuiltIn: true,
      },
      update: {
        description: item.description ?? null,
        advice: item.advice ?? null,
        isBuiltIn: true,
      },
      select: { id: true },
    });

    for (const [index, link] of (item.medications ?? []).entries()) {
      const medication = await prisma.medication.findUnique({
        where: { slug: link.slug },
        select: { id: true },
      });
      if (!medication) continue;

      await prisma.diagnosisMedication.upsert({
        where: {
          diagnosisId_medicationId: { diagnosisId: entry.id, medicationId: medication.id },
        },
        create: {
          diagnosisId: entry.id,
          medicationId: medication.id,
          note: link.note,
          position: index,
        },
        update: { note: link.note, position: index },
      });
      linked += 1;
    }
  }

  console.log(`✓ ${DIAGNOSIS_SEED.length} დიაგნოზი, ${linked} მედიკამენტის მიბმა`);
}
