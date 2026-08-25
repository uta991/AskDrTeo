import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { SunLogo } from '../components/Brand';
import { UserMenu } from '../components/UserMenu';
import { Conclusions, type Conclusion } from '../profile/Conclusions';
import styles from '../profile/profile.module.css';

export const metadata = { title: 'დიაგნოზები და დანიშნულებები — AskDrTeo' };

/**
 * ექიმის დასკვნები ცალკე გვერდად.
 *
 * პროფილის შიგნით ჩამარხული ის ძნელად საპოვნელი იყო — დანიშნულება
 * კი ის დოკუმენტია, რომელსაც მშობელი აფთიაქშიც ეძებს და ექიმთანაც.
 */
export default async function ConclusionsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'PARENT') redirect('/admin/video-visits');

  const conclusions = await apiFetch<Conclusion[]>('/video-visits/conclusions');

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/account" className={styles.brand}>
          <SunLogo size={44} />
          <span className={styles.name}>AskDrTeo</span>
        </Link>

        <UserMenu user={user} />
      </header>

      <div className={styles.body}>
        <section className="card">
          <h2 className={styles.sectionTitle}>
            დიაგნოზები და დანიშნულებები{' '}
            <span className={styles.count}>({conclusions?.length ?? 0})</span>
          </h2>
          <p className={styles.hint}>
            ონლაინ ვიზიტების დასკვნები. ინახება გაცემიდან ერთი წლის განმავლობაში.
          </p>

          <Conclusions items={conclusions ?? []} />
        </section>
      </div>
    </main>
  );
}
