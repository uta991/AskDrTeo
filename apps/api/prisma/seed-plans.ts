import {
  BillingInterval,
  FeatureType,
  PlanStatus,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client';

/**
 * პაკეტების ერთადერთი წყარო.
 *
 * სამი საფეხური: უფასო (გაცნობა + ზრდა/განვითარება), სტანდარტული
 * (+ დოზის კალკულატორი) და პრემიუმი (+ AI ასისტენტი პედიატრიაში).
 *
 * ცალკე ფაილია, რომ პაკეტების გადაწყობა სრული seed-ის გაშვების გარეშე
 * შეიძლებოდეს — მუშა ბაზაზე დემო მომხმარებლების შექმნა დაუშვებელია.
 */

const FEATURES = [
  { key: 'video_library', name: 'ვიდეო ბიბლიოთეკა', type: FeatureType.ACCESS, defaultValue: 'free_only' },
  { key: 'video_download', name: 'ოფლაინ ჩამოტვირთვა', type: FeatureType.BOOLEAN, defaultValue: 'false' },
  { key: 'chat_with_operator', name: 'ჩატი კონსულტანტთან', type: FeatureType.BOOLEAN, defaultValue: 'false' },
  { key: 'chat_priority', name: 'პრიორიტეტული პასუხი', type: FeatureType.BOOLEAN, defaultValue: 'false' },
  { key: 'max_children', name: 'ბავშვის პროფილები', type: FeatureType.LIMIT, unit: 'children', defaultValue: '1' },
  { key: 'growth_tracking', name: 'ზრდის დინამიკა', type: FeatureType.BOOLEAN, defaultValue: 'false' },
  { key: 'vaccination_calendar', name: 'აცრების კალენდარი', type: FeatureType.BOOLEAN, defaultValue: 'true' },
  { key: 'ad_free', name: 'რეკლამის გარეშე', type: FeatureType.BOOLEAN, defaultValue: 'false' },
  { key: 'dose_calculator', name: 'დოზის კალკულატორი', type: FeatureType.BOOLEAN, defaultValue: 'false' },
  { key: 'development_monitoring', name: 'განვითარების მონიტორინგი', type: FeatureType.BOOLEAN, defaultValue: 'true' },
  { key: 'ai_assistant', name: 'AI ასისტენტი', type: FeatureType.BOOLEAN, defaultValue: 'false' },
  {
    key: 'monthly_free_visit',
    name: 'უფასო ვიზიტი პედიატრთან',
    type: FeatureType.LIMIT,
    unit: 'visits',
    defaultValue: '0',
  },
  // ატვირთვის ლიმიტები ტიპების მიხედვით — ერთი საერთო რიცხვი 5MB-ს
  // ფოტოსთვის გონივრულს ხდიდა, ვიდეოსთვის კი უაზროს
  { key: 'max_upload_mb_image', name: 'სურათის მაქს. ზომა', type: FeatureType.LIMIT, unit: 'MB', defaultValue: '5' },
  { key: 'max_upload_mb_video', name: 'ვიდეოს მაქს. ზომა', type: FeatureType.LIMIT, unit: 'MB', defaultValue: '200' },
  { key: 'max_upload_mb_document', name: 'დოკუმენტის მაქს. ზომა', type: FeatureType.LIMIT, unit: 'MB', defaultValue: '10' },
];

const PLANS = [
  {
    code: 'free',
    name: 'უფასო',
    description: 'განვითარების მონიტორინგი და აპლიკაციის გაცნობა',
    isFree: true,
    isDefault: true,
    sortOrder: 1,
    colorHex: '#c4574d',
    prices: [],
    features: {
      video_library: 'free_only',
      video_download: false,
      chat_with_operator: false,
      chat_priority: false,
      max_children: '1',
      max_upload_mb_image: '5',
      max_upload_mb_document: '5',
      // უფასოში მხოლოდ განვითარების მონიტორინგი — დანარჩენი ფასიანშია
      development_monitoring: true,
      growth_tracking: false,
      vaccination_calendar: false,
      dose_calculator: false,
      ai_assistant: false,
      monthly_free_visit: false,
      ad_free: false,
    },
  },
  {
    code: 'standard',
    name: 'სტანდარტული',
    description: 'დოზის კალკულატორი, სრული ვიდეო ბიბლიოთეკა და ჩატი კონსულტანტთან',
    badge: 'პოპულარული',
    highlight: true,
    trialDays: 7,
    sortOrder: 2,
    colorHex: '#e8a400',
    prices: [
      { currency: 'GEL', amountMinor: 1990, interval: BillingInterval.MONTH },
      { currency: 'GEL', amountMinor: 19900, interval: BillingInterval.YEAR },
    ],
    features: {
      video_library: 'all',
      video_download: false,
      chat_with_operator: true,
      chat_priority: false,
      max_children: '3',
      max_upload_mb_image: '10',
      max_upload_mb_document: '20',
      growth_tracking: true,
      development_monitoring: true,
      vaccination_calendar: true,
      dose_calculator: true,
      ai_assistant: false,
      monthly_free_visit: false,
      ad_free: true,
    },
  },
  {
    code: 'premium',
    name: 'პრემიუმი',
    description: 'AI ასისტენტი და თვეში ერთი უფასო ვიზიტი პედიატრ თეონა ტაბატაძესთან',
    sortOrder: 3,
    colorHex: '#007201',
    prices: [
      { currency: 'GEL', amountMinor: 3990, interval: BillingInterval.MONTH },
      { currency: 'GEL', amountMinor: 39900, interval: BillingInterval.YEAR },
    ],
    features: {
      video_library: 'all',
      video_download: true,
      chat_with_operator: true,
      chat_priority: true,
      max_children: 'unlimited',
      max_upload_mb_image: '25',
      max_upload_mb_document: '100',
      growth_tracking: true,
      development_monitoring: true,
      vaccination_calendar: true,
      dose_calculator: true,
      ai_assistant: true,
      // თვეში ერთი უფასო ვიზიტი პედიატრ თეონა ტაბატაძესთან
      monthly_free_visit: '1',
      ad_free: true,
    },
  },
];

/** პაკეტები, რომლებიც აღარ იყიდება — გამომწერები მითითებულზე გადადიან. */
const RETIRED: { code: string; movedTo: string }[] = [{ code: 'unlimited', movedTo: 'premium' }];

export async function seedPlans(prisma: PrismaClient): Promise<void> {
  for (const [i, f] of FEATURES.entries()) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, type: f.type, unit: f.unit, defaultValue: f.defaultValue },
      create: { ...f, sortOrder: i + 1 },
    });
  }
  console.log(`✓ ${FEATURES.length} ფუნქცია`);

  for (const p of PLANS) {
    const { prices, features, ...planData } = p;

    const plan = await prisma.plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        sortOrder: p.sortOrder,
        colorHex: p.colorHex,
      },
      create: { ...planData, status: PlanStatus.ACTIVE },
    });

    for (const price of prices) {
      await prisma.planPrice.upsert({
        where: {
          planId_currency_interval_intervalCount: {
            planId: plan.id,
            currency: price.currency,
            interval: price.interval,
            intervalCount: 1,
          },
        },
        update: { amountMinor: price.amountMinor },
        create: { planId: plan.id, ...price },
      });
    }

    for (const [key, value] of Object.entries(features)) {
      const feature = await prisma.feature.findUniqueOrThrow({ where: { key } });
      const enabled = typeof value === 'boolean' ? value : true;
      const stored = typeof value === 'boolean' ? null : String(value);

      await prisma.planFeature.upsert({
        where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
        update: { enabled, value: stored },
        create: { planId: plan.id, featureId: feature.id, enabled, value: stored },
      });
    }
  }
  console.log(`✓ ${PLANS.length} პაკეტი ფასებითა და ფუნქციებით`);

  await retirePlans(prisma);
}

/**
 * მოხსნილი პაკეტის ჩამქრობა.
 *
 * ჩანაწერი არ იშლება — გამოწერებისა და გადახდების ისტორია მასზე
 * მიუთითებს. მოქმედი გამომწერები ახალ პაკეტზე გადადიან, თავად პაკეტი
 * კი არქივდება და ფასების სიაში აღარ ჩნდება.
 */
async function retirePlans(prisma: PrismaClient): Promise<void> {
  for (const { code, movedTo } of RETIRED) {
    const plan = await prisma.plan.findUnique({ where: { code } });
    if (!plan || plan.status === PlanStatus.ARCHIVED) continue;

    const target = await prisma.plan.findUniqueOrThrow({ where: { code: movedTo } });

    const moved = await prisma.subscription.updateMany({
      where: {
        planId: plan.id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      data: { planId: target.id },
    });

    const promos = await prisma.promoCode.updateMany({
      where: { planId: plan.id },
      data: { planId: target.id },
    });

    await prisma.plan.update({
      where: { id: plan.id },
      data: { status: PlanStatus.ARCHIVED, isDefault: false, deletedAt: new Date() },
    });

    console.log(
      `✓ პაკეტი "${code}" არქივში — ${moved.count} გამოწერა და ${promos.count} პრომო "${movedTo}"-ზე`,
    );
  }
}

// პირდაპირ გაშვება: npx tsx prisma/seed-plans.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  seedPlans(prisma)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
