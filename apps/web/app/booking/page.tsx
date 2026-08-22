import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { getChildren } from '@/lib/children';
import { SunLogo } from '../components/Brand';
import { BookingForm } from './BookingForm';
import type { Appointment, Quota } from './actions';
import styles from './booking.module.css';

export const metadata = { title: 'ვიზიტის ჯავშანი — AskDrTeo' };

export default async function BookingPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'PARENT') redirect('/admin/appointments');

  const [children, appointments, quota] = await Promise.all([
    getChildren(),
    apiFetch<Appointment[]>('/appointments'),
    apiFetch<Quota>('/appointments/quota'),
  ]);

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
            მიუთითეთ სასურველი დრო — დადასტურებას შეტყობინებით მიიღებთ.
          </p>
        </div>

        <BookingForm
          childProfiles={children ?? []}
          appointments={appointments ?? []}
          quota={quota ?? { limit: 0, used: 0, remaining: 0 }}
        />
      </div>
    </main>
  );
}
