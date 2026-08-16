import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { SunLogo } from '../components/Brand';
import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export const metadata = { title: 'შესვლა — AskDrTeo' };

export default async function LoginPage() {
  // უკვე შესულს login აღარ სჭირდება
  const current = await getSessionUser();
  if (current) redirect(current.role !== 'PARENT' ? '/admin' : '/account');

  return (
    <main className={styles.page}>
      {/* უკან — მთავარ გვერდზე */}
      <Link href="/" className={styles.back}>
        ← მთავარ გვერდზე
      </Link>

      <div className={styles.card}>
        <div className={styles.header}>
          <SunLogo size={72} />
          <h1 className={styles.title}>შესვლა</h1>
          <p className={styles.subtitle}>იმავე მონაცემებით, რითაც აპლიკაციაში</p>
        </div>

        <LoginForm />

        <p className={styles.note}>
          არ გაქვთ ანგარიში? დარეგისტრირდით მობილურ აპლიკაციაში — SMS
          დადასტურება იქ ხდება.
        </p>
      </div>
    </main>
  );
}
