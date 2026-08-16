import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { SunLogo } from '../../components/Brand';
import { ChildForm } from './ChildForm';
import styles from './child.module.css';

export const metadata = { title: 'ბავშვის პროფილი — AskDrTeo' };

export default async function ChildFormPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'PARENT') redirect('/admin');

  return (
    <main className={styles.page}>
      <Link href="/account" className={styles.back}>
        ← ჩემი კაბინეტი
      </Link>

      <div className={styles.card}>
        <div className={styles.header}>
          <SunLogo size={56} />
          <h1 className={styles.title}>ბავშვის პროფილი</h1>
          <p className={styles.subtitle}>
            ასაკის მიხედვით რჩევებს ამ მონაცემებზე დაყრდნობით შეგირჩევთ
          </p>
        </div>

        <ChildForm />
      </div>
    </main>
  );
}
