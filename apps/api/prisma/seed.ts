import { seedPlans } from './seed-plans';
import { PrismaClient, UserRole } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from '../src/modules/permissions/permission-catalog';

const prisma = new PrismaClient();

/**
 * საწყისი მონაცემები. ყველაფერი idempotent-ია (upsert) — ხელახლა გაშვება უსაფრთხოა.
 *
 * ყურადღება: აქ მხოლოდ *საწყისი* პაკეტებია. შემდგომ ცვლილებებს Super Admin
 * ადმინ-პანელიდან აკეთებს — ეს ფაილი აღარ იცვლება.
 */

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
  await seedPlans(prisma);

  for (const c of CATEGORIES) {
    await prisma.videoCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: c,
    });
  }
  console.log(`✓ ${CATEGORIES.length} ვიდეო კატეგორია`);

  for (const [i, permission] of PERMISSIONS.entries()) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { name: permission.name, group: permission.group, sortOrder: i },
      create: { ...permission, sortOrder: i },
    });
  }
  console.log(`✓ ${PERMISSIONS.length} უფლება`);

  // ნაგულისხმევი მიბმები — არსებულს არ ვცვლით, რომ ადმინის ხელით
  // გაკეთებული ცვლილებები seed-ის ხელახლა გაშვებამ არ წაშალოს
  for (const [role, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const key of keys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: { role: role as UserRole, permissionId: permission.id },
        },
        update: {},
        create: { role: role as UserRole, permissionId: permission.id },
      });
    }
  }
  console.log('✓ როლების ნაგულისხმევი უფლებები');

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
