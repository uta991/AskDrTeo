import { PrismaClient } from '@prisma/client';

/**
 * აცრების კალენდრის საწყისი ცნობარი.
 *
 * ⚠️ ეს სამუშაო ვერსიაა და პედიატრს უნდა შეამოწმოს. ეროვნული კალენდარი
 * იცვლება, ამიტომ ცნობარი ბაზაშია და ადმინის პანელიდან იმართება —
 * შესწორება აპლიკაციის განახლებას არ მოითხოვს.
 */
const VACCINES = [
  // ── დაბადებისთანავე ──────────────────────────────────────────
  { code: 'HEPB_0', name: 'B ჰეპატიტი — I დოზა', ageMonths: 0, doseNumber: 1,
    description: 'B ჰეპატიტის ვირუსისგან. კეთდება დაბადებიდან პირველ დღეს.' },
  { code: 'BCG', name: 'BCG — ტუბერკულოზი', ageMonths: 0, doseNumber: 1,
    description: 'ტუბერკულოზის მძიმე ფორმებისგან.' },

  // ── 2 თვე ────────────────────────────────────────────────────
  { code: 'PENTA_1', name: 'პენტავალენტური — I დოზა', ageMonths: 2, doseNumber: 1,
    description: 'დიფტერია, ყივანახველა, ტეტანუსი, B ჰეპატიტი და ჰემოფილუსი.' },
  { code: 'IPV_1', name: 'პოლიომიელიტი (IPV) — I დოზა', ageMonths: 2, doseNumber: 1,
    description: 'ინაქტივირებული პოლიოვაქცინა.' },
  { code: 'PCV_1', name: 'პნევმოკოკური — I დოზა', ageMonths: 2, doseNumber: 1,
    description: 'პნევმონიისა და მენინგიტის გავრცელებული გამომწვევისგან.' },
  { code: 'ROTA_1', name: 'როტავირუსი — I დოზა', ageMonths: 2, doseNumber: 1,
    description: 'მძიმე დიარეის ყველაზე ხშირი გამომწვევისგან. პირით მიიღება.' },

  // ── 3 თვე ────────────────────────────────────────────────────
  { code: 'PENTA_2', name: 'პენტავალენტური — II დოზა', ageMonths: 3, doseNumber: 2 },
  { code: 'OPV_1', name: 'პოლიომიელიტი (OPV) — I დოზა', ageMonths: 3, doseNumber: 1 },
  { code: 'PCV_2', name: 'პნევმოკოკური — II დოზა', ageMonths: 3, doseNumber: 2 },
  { code: 'ROTA_2', name: 'როტავირუსი — II დოზა', ageMonths: 3, doseNumber: 2 },

  // ── 4 თვე ────────────────────────────────────────────────────
  { code: 'PENTA_3', name: 'პენტავალენტური — III დოზა', ageMonths: 4, doseNumber: 3 },
  { code: 'OPV_2', name: 'პოლიომიელიტი (OPV) — II დოზა', ageMonths: 4, doseNumber: 2 },

  // ── 12 თვე ───────────────────────────────────────────────────
  { code: 'MMR_1', name: 'წითელა, ყბაყურა, წითურა — I დოზა', ageMonths: 12, doseNumber: 1,
    description: 'სამივე ინფექციისგან ერთი აცრით.' },
  { code: 'PCV_3', name: 'პნევმოკოკური — III დოზა', ageMonths: 12, doseNumber: 3 },

  // ── 18 თვე ───────────────────────────────────────────────────
  { code: 'DTP_4', name: 'DTP — გამაძლიერებელი დოზა', ageMonths: 18, doseNumber: 4,
    description: 'დიფტერიის, ყივანახველისა და ტეტანუსის იმუნიტეტის განახლება.' },
  { code: 'OPV_3', name: 'პოლიომიელიტი (OPV) — III დოზა', ageMonths: 18, doseNumber: 3 },

  // ── 5 წელი ───────────────────────────────────────────────────
  { code: 'MMR_2', name: 'წითელა, ყბაყურა, წითურა — II დოზა', ageMonths: 60, doseNumber: 2 },
  { code: 'DTP_5', name: 'DTP — მეორე გამაძლიერებელი', ageMonths: 60, doseNumber: 5 },
];

export async function seedVaccines(prisma: PrismaClient): Promise<void> {
  for (const [index, vaccine] of VACCINES.entries()) {
    await prisma.vaccine.upsert({
      where: { code: vaccine.code },
      update: {
        name: vaccine.name,
        description: vaccine.description ?? null,
        ageMonths: vaccine.ageMonths,
        doseNumber: vaccine.doseNumber,
        sortOrder: index + 1,
      },
      create: {
        code: vaccine.code,
        name: vaccine.name,
        description: vaccine.description ?? null,
        ageMonths: vaccine.ageMonths,
        doseNumber: vaccine.doseNumber,
        sortOrder: index + 1,
      },
    });
  }

  console.log(`✓ ${VACCINES.length} აცრა კალენდარში`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedVaccines(prisma)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
