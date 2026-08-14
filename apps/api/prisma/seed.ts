import { FeatureType, PlanStatus, PrismaClient, BillingInterval } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * საწყისი მონაცემები. ყველაფერი idempotent-ია (upsert) — ხელახლა გაშვება უსაფრთხოა.
 *
 * ყურადღება: აქ მხოლოდ *საწყისი* პაკეტებია. შემდგომ ცვლილებებს Super Admin
 * ადმინ-პანელიდან აკეთებს — ეს ფაილი აღარ იცვლება.
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
];

const PLANS = [
  {
    code: 'free',
    name: 'უფასო',
    description: 'საბაზისო წვდომა — გაეცანი აპლიკაციას',
    isFree: true,
    isDefault: true,
    sortOrder: 1,
    colorHex: '#94A3B8',
    prices: [],
    features: {
      video_library: 'free_only',
      video_download: false,
      chat_with_operator: false,
      chat_priority: false,
      max_children: '1',
      growth_tracking: false,
      vaccination_calendar: true,
      ad_free: false,
    },
  },
  {
    code: 'standard',
    name: 'სტანდარტული',
    description: 'სრული ვიდეო ბიბლიოთეკა და ჩატი კონსულტანტთან',
    badge: 'პოპულარული',
    highlight: true,
    trialDays: 7,
    sortOrder: 2,
    colorHex: '#3B82F6',
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
      growth_tracking: true,
      vaccination_calendar: true,
      ad_free: true,
    },
  },
  {
    code: 'premium',
    name: 'პრემიუმი',
    description: 'ყველა ფუნქცია, პრიორიტეტული მხარდაჭერა და ოფლაინ რეჟიმი',
    sortOrder: 3,
    colorHex: '#F5B800',
    prices: [
      { currency: 'GEL', amountMinor: 3990, interval: BillingInterval.MONTH },
      { currency: 'GEL', amountMinor: 39900, interval: BillingInterval.YEAR },
    ],
    features: {
      video_library: 'all',
      video_download: true,
      chat_with_operator: true,
      chat_priority: true,
      max_children: '5',
      growth_tracking: true,
      vaccination_calendar: true,
      ad_free: true,
    },
  },
  {
    code: 'unlimited',
    name: 'ულიმიტო',
    description: 'ულიმიტო ბავშვის პროფილი და სრული წვდომა ყველა სერვისზე',
    sortOrder: 4,
    colorHex: '#E8A400',
    prices: [
      { currency: 'GEL', amountMinor: 5990, interval: BillingInterval.MONTH },
      { currency: 'GEL', amountMinor: 59900, interval: BillingInterval.YEAR },
    ],
    features: {
      video_library: 'all',
      video_download: true,
      chat_with_operator: true,
      chat_priority: true,
      max_children: 'unlimited',
      growth_tracking: true,
      vaccination_calendar: true,
      ad_free: true,
    },
  },
];

const CATEGORIES = [
  { slug: 'newborn', name: 'ახალშობილი (0–3 თვე)', sortOrder: 1 },
  { slug: 'feeding', name: 'კვება და ძუძუთი კვება', sortOrder: 2 },
  { slug: 'sleep', name: 'ძილის რეჟიმი', sortOrder: 3 },
  { slug: 'health', name: 'ჯანმრთელობა და აცრები', sortOrder: 4 },
  { slug: 'development', name: 'განვითარება', sortOrder: 5 },
  { slug: 'first-aid', name: 'პირველადი დახმარება', sortOrder: 6 },
];

const SETTINGS = [
  { key: 'min_app_version_ios', value: '1.0.0', isPublic: true },
  { key: 'min_app_version_android', value: '1.0.0', isPublic: true },
  { key: 'maintenance_mode', value: false, isPublic: true },
  { key: 'support_phone', value: '+995322000000', isPublic: true },
  { key: 'terms_version', value: '1.0', isPublic: true },
];

async function main(): Promise<void> {
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
      update: { name: p.name, description: p.description, sortOrder: p.sortOrder },
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

  for (const c of CATEGORIES) {
    await prisma.videoCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: c,
    });
  }
  console.log(`✓ ${CATEGORIES.length} ვიდეო კატეგორია`);

  for (const s of SETTINGS) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`✓ ${SETTINGS.length} სისტემური პარამეტრი`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
