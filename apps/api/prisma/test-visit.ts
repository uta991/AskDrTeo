import { PrismaClient, UserRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';

/**
 * სატესტო ვიდეო ვიზიტი — გადახდის გარეშე.
 *
 * ჩვეულებრივ ჯავშანი მხოლოდ დადასტურებული გადახდის შემდეგ იქმნება.
 * სანამ ბანკის გასაღებები ჩართული არ არის, მთელი ნაკადის შემოწმება
 * სხვაგვარად შეუძლებელია.
 *
 *   npm run visit:test -- parent@example.com
 */

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) throw new Error('მიუთითეთ მშობლის ელ. ფოსტა');

  const parent = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!parent) throw new Error(`მომხმარებელი ${email} ვერ მოიძებნა`);

  const child = await prisma.child.findFirst({
    where: { parentId: parent.id, deletedAt: null },
    select: { id: true, firstName: true },
  });

  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ვიზიტი მაშინვე დანიშნულია — ჩართვის ღილაკი 30 წუთით ადრე იხსნება
  const scheduledAt = new Date(now.getTime() + 5 * 60 * 1000);

  const visit = await prisma.videoVisit.create({
    data: {
      parentId: parent.id,
      childId: child?.id ?? null,
      requestedDate: day,
      scheduledAt,
      status: 'SCHEDULED',
      reason: 'სატესტო ვიზიტი — ვიდეოსა და ჩატის შესამოწმებლად',
      roomName: `askdrteo-${randomBytes(9).toString('hex')}`,
    },
  });

  const doctors = await prisma.user.findMany({
    where: { role: UserRole.SUPER_ADMIN, deletedAt: null },
    select: { email: true, firstName: true },
  });

  console.log(`✓ ვიზიტი შეიქმნა — ${scheduledAt.toLocaleString('ka-GE')}`);
  console.log(`  მშობელი: ${parent.firstName} (${email})`);
  console.log(`  ბავშვი:  ${child?.firstName ?? 'მითითებული არ არის'}`);
  console.log(`  id:      ${visit.id}\n`);
  console.log('  მშობელი →  /video-visit');
  console.log('  ექიმი   →  /admin/video-visits\n');
  console.log(`  ვიზიტს ატარებს (SUPER_ADMIN): ${doctors.map((d) => d.email).join(', ') || '— არავინ'}`);
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
