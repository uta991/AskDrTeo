import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { ChatQueue, type QueueRow } from './ChatQueue';
import type { Thread } from '../../chat/actions';
import { FeedbackSummary, type Feedback } from './FeedbackSummary';
import styles from '../admin.module.css';

export const metadata = { title: 'ჩატი — AskDrTeo' };

export default async function AdminChatPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'PARENT') redirect('/chat');

  const [rows, feedback] = await Promise.all([
    apiFetch<QueueRow[]>('/admin/chat/conversations'),
    apiFetch<Feedback>('/admin/chat/feedback'),
  ]);

  // პირველი საუბარი მაშინვე გახსნილი — ოპერატორს ზედმეტი კლიკი არ სჭირდება
  const first = rows?.[0]
    ? await apiFetch<Thread>(`/admin/chat/conversations/${rows[0].id}`)
    : null;

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="chat" />

      <div className="container">
        <h2 className={styles.sectionTitle}>
          შეკითხვები <span className={styles.count}>({rows?.length ?? 0})</span>
        </h2>
        <p className={styles.hint}>
          პრიორიტეტული პაკეტის მშობელი რიგში წინ დგას.
        </p>

        <ChatQueue rows={rows ?? []} first={first} />

        <h2 className={styles.sectionTitle}>მშობლების შეფასებები</h2>
        <FeedbackSummary feedback={feedback} />
      </div>
    </main>
  );
}
