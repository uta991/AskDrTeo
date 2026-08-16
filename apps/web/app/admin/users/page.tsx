import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { UserCard, type AdminUser, type PlanOption } from '../UserCard';
import { UserSearch } from './UserSearch';
import styles from '../admin.module.css';

export const metadata = { title: 'მომხმარებლები — AskDrTeo' };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'PARENT') redirect('/account');

  const { q = '' } = await searchParams;

  // მხოლოდ მშობლები — პერსონალს ცალკე გვერდი აქვს, როგორც აპლიკაციაში
  const params = new URLSearchParams({ role: 'PARENT', perPage: '50' });
  if (q.trim()) params.set('search', q.trim());

  const [users, plans] = await Promise.all([
    apiFetch<{ items: AdminUser[]; total: number }>(`/admin/users?${params.toString()}`),
    apiFetch<PlanOption[]>('/plans'),
  ]);

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="users" />

      <div className="container">
        <h2 className={styles.sectionTitle}>
          მშობლები <span className={styles.count}>({users?.total ?? 0})</span>
        </h2>

        <UserSearch initial={q} />

        {!users?.items.length ? (
          <p className={styles.empty}>
            {q ? 'ძებნამ შედეგი ვერ იპოვა.' : 'ჯერ არავინაა დარეგისტრირებული.'}
          </p>
        ) : (
          <div className={styles.userList}>
            {users.items.map((item) => (
              <UserCard
                key={item.id}
                user={item}
                plans={plans ?? []}
                canManageAccounts={user.role === 'SUPER_ADMIN'}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
