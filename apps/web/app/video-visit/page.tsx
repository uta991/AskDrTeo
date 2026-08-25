import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { getChildren } from '@/lib/children';
import { SunLogo } from '../components/Brand';
import { getMyVisits, getOffer } from './actions';
import { MyVisits } from './MyVisits';
import { VisitBooking } from './VisitBooking';
import styles from './visit.module.css';

export const metadata = { title: 'ვიზიტი პედიატრთან — AskDrTeo' };

export default async function VideoVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'PARENT') redirect('/admin/video-visits');

  const [offer, visits, children] = await Promise.all([
    getOffer(),
    getMyVisits(),
    getChildren(),
  ]);

  return (
    <main className={styles.page}>
      <Link href="/account" className={styles.back}>
        ← უკან
      </Link>

      <header className={styles.head}>
        <SunLogo size={44} />
        <h1 className={styles.title}>ვიზიტი პედიატრთან</h1>
        <p className={styles.subtitle}>
          ონლაინ შეხვედრა ექიმთან — ვიდეო, ხმა და ჩატი ერთ ოთახში.
        </p>
      </header>

      <MyVisits visits={visits ?? []} notice={error} />

      {offer ? (
        <VisitBooking
          days={offer.days}
          price={offer.price}
          basePrice={offer.basePrice}
          coverPercent={offer.coverPercent}
          freeCredits={offer.freeCredits}
          childProfiles={children ?? []}
        />
      ) : (
        <p className={styles.empty}>ჯავშნის კალენდარი ვერ ჩაიტვირთა — სცადეთ ცოტა ხანში.</p>
      )}
    </main>
  );
}
