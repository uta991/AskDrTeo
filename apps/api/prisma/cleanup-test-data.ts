import { PrismaClient } from '@prisma/client';

/**
 * სატესტო მონაცემების წაშლა.
 *
 * ტესტირებისას შექმნილი ვიზიტები, პრომო კოდები და უფლებები რეალურ
 * ბაზაში რჩება და გაშვების შემდეგ სტატისტიკას ამრუდებს. ეს სკრიპტი
 * მხოლოდ ცალსახად სატესტო ჩანაწერებს ეხება.
 *
 *   npm run cleanup:test
 */

const prisma = new PrismaClient();

/** კოდები, რომლებიც ტესტირებისთვის შეიქმნა. */
const TEST_PROMO_CODES = ['TESTVISIT1'];

/** ვიზიტები ამ მიზეზებით სატესტოა. */
const TEST_REASONS = [
  'სატესტო ვიზიტი — ვიდეოსა და ჩატის შესამოწმებლად',
  'სატესტო დაგვიანება',
  'სატესტო',
];

async function main(): Promise<void> {
  const visits = await prisma.videoVisit.findMany({
    where: { reason: { in: TEST_REASONS } },
    select: { id: true },
  });
  const visitIds = visits.map((visit) => visit.id);

  if (visitIds.length) {
    // უფლება ვიზიტზეა მიბმული — ჯერ კავშირი უნდა გაწყდეს
    await prisma.videoVisitCredit.updateMany({
      where: { visitId: { in: visitIds } },
      data: { visitId: null },
    });
    await prisma.videoVisit.deleteMany({ where: { id: { in: visitIds } } });
  }

  const credits = await prisma.videoVisitCredit.deleteMany({
    where: { note: { contains: 'TESTVISIT' } },
  });

  const promos = await prisma.promoCode.deleteMany({
    where: { code: { in: TEST_PROMO_CODES } },
  });

  console.log(`ვიზიტი:      ${visitIds.length}`);
  console.log(`უფლება:      ${credits.count}`);
  console.log(`პრომო კოდი:  ${promos.count}`);
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
