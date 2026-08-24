import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { AppointmentRow } from './AppointmentRow';
import type { AdminAppointment } from './actions';
import styles from '../admin.module.css';

export const metadata = { title: 'ვიზიტები — AskDrTeo' };

export default async function AdminAppointmentsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'PARENT') redirect('/video-visit');

  const appointments = await apiFetch<AdminAppointment[]>('/admin/appointments');
  const waiting = (appointments ?? []).filter((item) => item.status === 'REQUESTED');

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="videoVisits" />

      <div className="container">
        <h2 className={styles.sectionTitle}>
          ვიზიტის მოთხოვნები <span className={styles.count}>({waiting.length})</span>
        </h2>
        <p className={styles.hint}>
          ეს ძველი მოთხოვნების არქივია — ახალი ვიზიტები „ვიზიტები" ველშია.
        </p>

        {!appointments?.length ? (
          <p className={styles.empty}>ჯერ არცერთი მოთხოვნა არ არის.</p>
        ) : (
          <div className={styles.userList}>
            {appointments.map((item) => (
              <AppointmentRow key={item.id} appointment={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
