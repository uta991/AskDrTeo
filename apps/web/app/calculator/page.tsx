import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { can, getEntitlements } from '@/lib/entitlements';
import { SunLogo } from '../components/Brand';
import { CalculatorForm } from './CalculatorForm';
import type { Medication } from '@/lib/medications';
import styles from './calculator.module.css';

export const metadata = { title: 'დოზის კალკულატორი — AskDrTeo' };

export default async function CalculatorPage() {
  // დოზირება სამედიცინო ინფორმაციაა — ღიად არ ვდებთ
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // კალკულატორი ფასიან პაკეტშია — უფასოს ვთავაზობთ განახლებას და არა ცარიელ ფორმას
  const entitlements = await getEntitlements();
  if (!can(entitlements, 'dose_calculator', user.role)) {
    return (
      <main className={styles.page}>
        <Link href="/account" className={styles.back}>
          ← უკან
        </Link>

        <div className={styles.card}>
          <div className={styles.header}>
            <SunLogo size={44} />
            <h1 className={styles.title}>დოზის კალკულატორი</h1>
            <p className={styles.subtitle}>
              ეს ფუნქცია სტანდარტულ და პრემიუმ პაკეტშია. თქვენი პაკეტი — უფასო.
            </p>
          </div>

          <div className={styles.upgrade}>
            <Link href="/plans" className="btn btn-primary">
              პაკეტების ნახვა
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const medications = await apiFetch<Medication[]>('/medications');

  return (
    <main className={styles.page}>
      <Link href={user.role === 'PARENT' ? '/account' : '/admin'} className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.headerBar}>
        <div className={styles.headerInner}>
          <h1 className={styles.headerTitle}>დოზის კალკულატორი</h1>
          <p className={styles.headerSubtitle}>
            აირჩიეთ წამალი, მიუთითეთ ბავშვის წონა და ასაკი
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <CalculatorForm medications={medications ?? []} />
      </div>
    </main>
  );
}
