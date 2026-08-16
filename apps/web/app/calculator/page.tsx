import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { SunLogo } from '../components/Brand';
import { CalculatorForm } from './CalculatorForm';
import type { Medication } from '@/lib/medications';
import styles from './calculator.module.css';

export const metadata = { title: 'დოზის კალკულატორი — AskDrTeo' };

export default async function CalculatorPage() {
  // დოზირება სამედიცინო ინფორმაციაა — ღიად არ ვდებთ
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const medications = await apiFetch<Medication[]>('/medications');

  return (
    <main className={styles.page}>
      <Link href={user.role === 'PARENT' ? '/account' : '/admin'} className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.card}>
        <div className={styles.header}>
          <SunLogo size={52} />
          <h1 className={styles.title}>დოზის კალკულატორი</h1>
          <p className={styles.subtitle}>
            აირჩიეთ წამალი, მიუთითეთ ბავშვის წონა და ასაკი
          </p>
        </div>

        <CalculatorForm medications={medications ?? []} />
      </div>
    </main>
  );
}
