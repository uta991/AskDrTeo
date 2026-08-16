import { MedicationDosingType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MEDS = [
  {
    slug: 'paracetamol',
    name: 'პარაცეტამოლი',
    dosingType: MedicationDosingType.PER_KG,
    mgPerKgMin: 10,
    mgPerKgMax: 15,
    intervalHoursMin: 4,
    intervalHoursMax: 6,
    maxDailyMg: 2000,
    minAgeMonths: 0,
    minWeightKg: 3,
    sortOrder: 1,
    concentrations: [
      { label: 'სიროფი 120 მგ / 5 მლ', mg: 120, ml: 5 },
      { label: 'სიროფი 125 მგ / 5 მლ', mg: 125, ml: 5 },
      { label: 'სიროფი 250 მგ / 5 მლ', mg: 250, ml: 5 },
      { label: 'წვეთები 100 მგ / 1 მლ', mg: 100, ml: 1 },
    ],
  },
  {
    slug: 'ibuprofen',
    name: 'იბუპროფენი',
    dosingType: MedicationDosingType.PER_KG,
    mgPerKgMin: 10,
    mgPerKgMax: 10,
    intervalHoursMin: 6,
    intervalHoursMax: 8,
    maxDailyMg: 1000,
    minAgeMonths: 6,
    minWeightKg: 5,
    sortOrder: 2,
    note: '6 თვემდე არ გამოიყენება.',
    concentrations: [
      { label: 'სიროფი 100 მგ / 5 მლ', mg: 100, ml: 5 },
      { label: 'სიროფი 200 მგ / 5 მლ', mg: 200, ml: 5 },
      { label: 'წვეთები 40 მგ / 1 მლ', mg: 40, ml: 1 },
    ],
  },
  {
    slug: 'dexamethasone',
    name: 'დექსამეტაზონი',
    dosingType: MedicationDosingType.PER_KG,
    mgPerKgMin: 0.6,
    mgPerKgMax: 0.6,
    intervalHoursMin: 24,
    intervalHoursMax: 24,
    maxDailyMg: 10,
    minAgeMonths: 0,
    minWeightKg: 3,
    sortOrder: 3,
    concentrations: [
      { label: 'ხსნარი 2 მგ / 5 მლ', mg: 2, ml: 5 },
      { label: 'ამპულა 4 მგ / 1 მლ', mg: 4, ml: 1 },
    ],
  },
  {
    slug: 'fenistil',
    name: 'ფენისტილი',
    dosingType: MedicationDosingType.PER_KG,
    mgPerKgMin: 0.01,
    mgPerKgMax: 0.01,
    intervalHoursMin: 8,
    intervalHoursMax: 8,
    maxDailyMg: 3,
    minAgeMonths: 1,
    minWeightKg: 4,
    sortOrder: 4,
    concentrations: [{ label: 'წვეთები 1 მგ / 1 მლ (20 წვეთი)', mg: 1, ml: 1 }],
  },
  {
    slug: 'cetirizine',
    name: 'ცეტირიზინი',
    dosingType: MedicationDosingType.BY_AGE,
    ageBands: [
      { untilMonths: 24, mg: 2.5, label: '6 თვიდან 2 წლამდე' },
      { untilMonths: 72, mg: 6, label: '2-დან 6 წლამდე' },
      { untilMonths: 216, mg: 10, label: '6-დან 18 წლამდე' },
    ],
    intervalHoursMin: 24,
    intervalHoursMax: 24,
    maxDailyMg: 10,
    minAgeMonths: 6,
    minWeightKg: 8,
    sortOrder: 5,
    note: '6 თვემდე არ გამოიყენება. დოზა ასაკზეა და არა წონაზე.',
    concentrations: [
      { label: 'წვეთები 10 მგ / 1 მლ (20 წვეთი)', mg: 10, ml: 1 },
      { label: 'სიროფი 5 მგ / 5 მლ', mg: 5, ml: 5 },
    ],
  },
];

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
