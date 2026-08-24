import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { getQueue } from './actions';
import { QueueList } from './QueueList';
import styles from './queue.module.css';
import adminStyles from '../admin.module.css';

export const metadata = { title: 'ვიდეო ჯავშნები — AskDrTeo' };

function shiftDay(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export default async function AdminVideoVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'PARENT') redirect('/video-visit');

  const { date } = await searchParams;
  const queue = await getQueue(date);
  const day = queue?.date ?? new Date().toISOString().slice(0, 10);

  // შეხვედრას მხოლოდ მთავარი ადმინისტრატორი ატარებს
  const canConduct = user.role === 'SUPER_ADMIN';

  const waiting = (queue?.visits ?? []).filter((visit) => visit.status === 'REQUESTED');

  return (
    <main className={adminStyles.page}>
      <AdminNav user={user} active="videoVisits" />

      <div className="container">
        <div className={styles.dayBar}>
          <Link href={`/admin/video-visits?date=${shiftDay(day, -1)}`} className={styles.dayNav}>
            ‹ წინა
          </Link>

          <div className={styles.dayTitle}>
            <strong>{day}</strong>
            <span>
              {queue?.visits.length ?? 0} / {queue?.capacity ?? 5} ადგილი
            </span>
          </div>

          <Link href={`/admin/video-visits?date=${shiftDay(day, 1)}`} className={styles.dayNav}>
            შემდეგი ›
          </Link>
        </div>

        {waiting.length > 0 && (
          <p className={styles.hint}>
            {waiting.length} ჯავშანს საათი ჯერ არ აქვს დანიშნული — დანიშვნისთანავე
            მშობელს SMS მიდის.
          </p>
        )}

        {!canConduct && (
          <p className={styles.hint}>
            შეხვედრას მხოლოდ მთავარი ადმინისტრატორი ატარებს — თქვენ საათის დანიშვნა
            შეგიძლიათ.
          </p>
        )}

        {!queue?.visits.length ? (
          <p className={styles.empty}>ამ დღეს ვიდეო ჯავშანი არ არის.</p>
        ) : (
          <QueueList visits={queue.visits} canConduct={canConduct} date={day} />
        )}
      </div>
    </main>
  );
}
