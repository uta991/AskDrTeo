import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { can, getEntitlements } from '@/lib/entitlements';
import { SunLogo } from '../components/Brand';
import { ChatThread } from './ChatThread';
import type { Thread } from './actions';
import styles from './chat.module.css';

export const metadata = { title: 'ჩატი კონსულტანტთან — AskDrTeo' };

interface ConversationRow {
  id: string;
  subject: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
  lastMessageAt: string | null;
  lastMessage: string | null;
  unread: number;
}

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // პერსონალს საკუთარი რიგი აქვს — მშობლის ჩატში ადგილი არ აქვს
  if (user.role !== 'PARENT') redirect('/admin/chat');

  const entitlements = await getEntitlements();

  if (!can(entitlements, 'chat_with_operator', user.role)) {
    return (
      <main className={styles.page}>
        <Link href="/account" className={styles.back}>
          ← უკან
        </Link>

        <div className={styles.card}>
          <div className={styles.head}>
            <SunLogo size={44} />
            <h1 className={styles.title}>ჩატი კონსულტანტთან</h1>
            <p className={styles.subtitle}>
              ეს ფუნქცია სტანდარტულ და პრემიუმ პაკეტშია — შეკითხვას სამუშაო
              საათებში ცოცხალი კონსულტანტი პასუხობს.
            </p>
          </div>

          <div className={styles.upgrade}>
            <Link href="/plans" className="btn btn-primary">
              პაკეტების ნახვა
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const conversations = await apiFetch<ConversationRow[]>('/chat/conversations');

  // მიმდინარე საუბარი — თუ არ არის, ცარიელი ძაფი პირველი წერილისთვის
  const active = conversations?.find((c) => c.status !== 'CLOSED') ?? conversations?.[0] ?? null;
  const thread = active ? await apiFetch<Thread>(`/chat/conversations/${active.id}`) : null;

  return (
    <main className={styles.page}>
      <Link href="/account" className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.card}>
        <div className={styles.head}>
          <SunLogo size={44} />
          <h1 className={styles.title}>ჩატი კონსულტანტთან</h1>
          <p className={styles.subtitle}>
            შეკითხვას სამუშაო საათებში ვპასუხობთ. გადაუდებელ შემთხვევაში
            დარეკეთ 112-ზე.
          </p>
        </div>

        <ChatThread thread={thread} />
      </div>
    </main>
  );
}
