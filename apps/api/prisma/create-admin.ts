import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * ადმინისტრატორის შექმნა/განახლება.
 *
 *   npx ts-node prisma/create-admin.ts <email> <password> [role]
 *   npx ts-node prisma/create-admin.ts admin@example.com Str0ngPass SUPER_ADMIN
 *
 * არგუმენტების გარეშე იყენებს ქვემოთ მოცემულ ნაგულისხმევებს.
 * პროდაქშენზე სუსტი პაროლით გაშვება დაბლოკილია.
 */

const prisma = new PrismaClient();

const DEFAULTS = {
  email: 'admin2@example.com',
  password: '123456',
  firstName: 'Super',
  lastName: 'Admin',
  role: UserRole.SUPER_ADMIN,
};

const STRONG_PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

async function main(): Promise<void> {
  const [emailArg, passwordArg, roleArg] = process.argv.slice(2);

  const email = (emailArg ?? DEFAULTS.email).trim().toLowerCase();
  const password = passwordArg ?? DEFAULTS.password;
  const role = (roleArg as UserRole) ?? DEFAULTS.role;

  if (!Object.values(UserRole).includes(role)) {
    throw new Error(`უცნობი როლი: ${role}. დასაშვებია: ${Object.values(UserRole).join(', ')}`);
  }

  const isWeak = !STRONG_PASSWORD_RE.test(password);

  // სუსტი პაროლი მხოლოდ ლოკალურ გარემოშია დასაშვები
  if (isWeak && process.env.NODE_ENV === 'production') {
    throw new Error(
      'პროდაქშენზე სუსტი პაროლით ადმინის შექმნა აკრძალულია ' +
        '(საჭიროა მინიმუმ 8 სიმბოლო, ასო და ციფრი)',
    );
  }

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      deletedAt: null,
    },
    create: {
      email,
      firstName: DEFAULTS.firstName,
      lastName: DEFAULTS.lastName,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
      termsVersion: '1.0',
    },
  });

  console.log(`✓ ${user.role}: ${user.email}`);
  console.log(`  id: ${user.id}`);
  if (isWeak) {
    console.warn('  ⚠ პაროლი სუსტია — მხოლოდ ლოკალური გამოყენებისთვის');
  }
}

main()
  .catch((e) => {
    console.error('✗', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
