import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { UserCard, type AdminUser } from '../UserCard';
import { CreateStaffForm } from './CreateStaffForm';
import styles from '../admin.module.css';

export const metadata = { title: 'პერსონალი — AskDrTeo' };

export default async function AdminStaffPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // ანგარიშების მართვა Super Admin-ის უფლებაა — დანარჩენებს დაშბორდზე
  if (user.role !== 'SUPER_ADMIN') redirect('/admin');

  const staff = await apiFetch<{ items: AdminUser[] }>(
    '/admin/users?roles=OPERATOR,ADMIN,SUPER_ADMIN&perPage=100',
  );

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="staff" />

      <div className="container">
        <h2 className={styles.sectionTitle}>
          შიდა მომხმარებლები <span className={styles.count}>({staff?.items.length ?? 0})</span>
        </h2>
        <p className={styles.hint}>
          ოპერატორი, ადმინისტრატორი და მთავარი ადმინისტრატორი. მშობლები ცალკე
          გვერდზეა.
        </p>

        <CreateStaffForm />

        <div className={styles.userList}>
          {(staff?.items ?? []).map((item) => (
            <UserCard key={item.id} user={item} plans={[]} canManageAccounts />
          ))}
        </div>
      </div>
    </main>
  );
}
