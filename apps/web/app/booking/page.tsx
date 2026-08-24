import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { getChildren } from '@/lib/children';
import { SunLogo } from '../components/Brand';
import { BookingForm } from './BookingForm';
import { ConsultationPacks, type PacksOverview } from './ConsultationPacks';
import type { Appointment, Quota } from './actions';
import styles from './booking.module.css';

export const metadata = { title: 'ვიზიტის ჯავშანი — AskDrTeo' };

export default async function BookingPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'PARENT') redirect('/admin/appointments');

  const [children, appointments, quota, packs] = await Promise.all([
    getChildren(),
    apiFetch<Appointment[]>('/appointments'),
    apiFetch<Quota>('/appointments/quota'),
    apiFetch<PacksOverview>('/packs'),
  ]);

  const visitQuota = quota ?? { limit: 0, used: 0, remaining: 0 };

  // ლიმიტების შეთავაზება მაშინ, როცა უფასო ვიზიტი ამოიწურა
  const showPacks = visitQuota.remaining === 0 && !!packs?.offers?.length;

  return (
    <main className={styles.page}>
      <Link href="/account" className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.card}>
        <div className={styles.head}>
          <SunLogo size={44} />
          <h1 className={styles.title}>ვიზიტი პედიატრთან</h1>
          <p className={styles.subtitle}>
            გააგზავნეთ მოთხოვნა — ვიზიტის დროს ექიმი დანიშნავს და
            შეტყობინებითა და SMS-ით შეგატყობინებთ.
          </p>
        </div>

        <BookingForm
          childProfiles={children ?? []}
          appointments={appointments ?? []}
          quota={visitQuota}
        />

        {showPacks && <ConsultationPacks overview={packs} />}
      </div>
    </main>
  );
}
