import { PrismaClient } from '@prisma/client';
import { MEDICATION_SEED as MEDS } from './medication-catalog';

const prisma = new PrismaClient();


async function main() {
  for (const med of MEDS) {
    const { slug, ...rest } = med;
    await prisma.medication.upsert({
      where: { slug },
      create: { slug, ...rest } as never,
      update: rest as never,
    });
    console.log('✓', med.name);
  }
}

main().finally(() => prisma.$disconnect());
