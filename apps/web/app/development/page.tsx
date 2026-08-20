import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { SunLogo } from '../components/Brand';
import { UserMenu } from '../components/UserMenu';
import { AssessmentForm } from './AssessmentForm';
import styles from './development.module.css';

export const metadata = { title: 'განვითარების მონიტორინგი — AskDrTeo' };

interface Child {
  id: string;
  firstName: string;
}

export default async function DevelopmentPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const children = await apiFetch<Child[]>('/children');

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href={user.role === 'PARENT' ? '/account' : '/admin'} className={styles.brand}>
          <SunLogo size={44} />
          <span className={styles.name}>AskDrTeo</span>
        </Link>

        <UserMenu user={user} />
      </header>

      <div className={styles.headerBar}>
        <div className={styles.headerInner}>
          <h1 className={styles.headerTitle}>განვითარების მონიტორინგი</h1>
          <p className={styles.headerSubtitle}>
            ოთხი მიმართულება — უხეში მოტორიკა, ნატიფი მოტორიკა,
            სოციალურ-ემოციური და კოგნიტური/მეტყველება
          </p>
        </div>
      </div>

      <div className={styles.body}>
        {!children?.length ? (
          <section className="card">
            <p className={styles.empty}>
              კითხვები ასაკზეა შერჩეული — ჯერ დაამატეთ ბავშვის პროფილი.
            </p>
            <Link href="/account/child" className={styles.again}>
              ბავშვის დამატება
            </Link>
          </section>
        ) : (
          <AssessmentForm children={children} />
        )}
      </div>
    </main>
  );
}
