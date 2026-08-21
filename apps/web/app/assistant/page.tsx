import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { can, getEntitlements } from '@/lib/entitlements';
import { SunLogo } from '../components/Brand';
import { Chat, type ChatChild } from './Chat';
import styles from './assistant.module.css';

export const metadata = { title: 'AI ასისტენტი — AskDrTeo' };

export default async function AssistantPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const entitlements = await getEntitlements();

  if (!can(entitlements, 'ai_assistant', user.role)) {
    return (
      <main className={styles.page}>
        <Link href="/account" className={styles.back}>
          ← უკან
        </Link>

        <div className={styles.card}>
          <div className={styles.head}>
            <SunLogo size={44} />
            <h1 className={styles.title}>AI ასისტენტი</h1>
            <p className={styles.subtitle}>
              ასისტენტი პრემიუმ პაკეტშია — პედიატრიის დარგში დასმულ შეკითხვას
              წამებში პასუხობს.
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

  const [status, children] = await Promise.all([
    apiFetch<{ enabled: boolean }>('/ai/status'),
    apiFetch<ChatChild[]>('/children'),
  ]);

  return (
    <main className={styles.page}>
      <Link href={user.role === 'PARENT' ? '/account' : '/admin'} className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.card}>
        <div className={styles.head}>
          <SunLogo size={44} />
          <h1 className={styles.title}>AI ასისტენტი</h1>
          <p className={styles.subtitle}>პედიატრიის დარგში მშობლის დამხმარე</p>
        </div>

        {status?.enabled ? (
          <Chat profiles={children ?? []} />
        ) : (
          <p className={styles.offline}>
            ასისტენტი ჯერ არ არის ჩართული. სცადეთ მოგვიანებით.
          </p>
        )}
      </div>
    </main>
  );
}
