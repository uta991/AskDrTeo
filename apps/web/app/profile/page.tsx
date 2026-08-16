import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import type { Medication } from '@/lib/medications';
import { SunLogo } from '../components/Brand';
import { UserMenu } from '../components/UserMenu';
import { UserCard, type AdminUser, type PlanOption } from '../admin/UserCard';
import { CreateStaffForm } from '../admin/staff/CreateStaffForm';
import { CreatePromoForm } from '../admin/promo/CreatePromoForm';
import { PromoRow, type PromoCode } from '../admin/promo/PromoRow';
import { AddMedication } from '../admin/medications/AddMedication';
import { MedicationRow } from '../admin/medications/MedicationRow';
import { UserSearch } from '../admin/users/UserSearch';
import { PromoRedeem } from '../account/PromoRedeem';
import { PasswordForm } from './PasswordForm';
import styles from './profile.module.css';

export const metadata = { title: 'პროფილი — AskDrTeo' };

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'მშობელი',
  OPERATOR: 'ოპერატორი',
  ADMIN: 'ადმინისტრატორი',
  SUPER_ADMIN: 'მთავარი ადმინისტრატორი',
};

/**
 * პროფილი — აპლიკაციის იგივე პრინციპი.
 *
 * ყველა განყოფილება ერთ გვერდზეა და არა ცალკე ბმულებად: მენიუში
 * მხოლოდ დაშბორდი, სიახლეები და კალკულატორი რჩება, დანარჩენი მართვა
 * აქ ჩამოიწერება — ზუსტად ისე, როგორც ტელეფონზეა.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { q = '' } = await searchParams;
  const isStaff = user.role !== 'PARENT';
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const canManageContent = user.role === 'ADMIN' || isSuperAdmin;

  const params = new URLSearchParams({ role: 'PARENT', perPage: '50' });
  if (q.trim()) params.set('search', q.trim());

  const [parents, staff, plans, promos, medications] = await Promise.all([
    isStaff ? apiFetch<{ items: AdminUser[]; total: number }>(`/admin/users?${params}`) : null,
    isSuperAdmin
      ? apiFetch<{ items: AdminUser[] }>(
          '/admin/users?roles=OPERATOR,ADMIN,SUPER_ADMIN&perPage=100',
        )
      : null,
    apiFetch<PlanOption[]>('/plans'),
    canManageContent ? apiFetch<PromoCode[]>('/admin/promo') : null,
    canManageContent ? apiFetch<Medication[]>('/admin/medications') : null,
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href={isStaff ? '/admin' : '/account'} className={styles.brand}>
          <SunLogo size={44} />
          <span className={styles.name}>AskDrTeo</span>
        </Link>

        <UserMenu user={user} />
      </header>

      <div className={styles.body}>
        {/* ── ვინ ვარ ─────────────────────────────────────────── */}
        <section className="card">
          <div className={styles.identity}>
            <div className={styles.avatar}>
              {user.firstName.slice(0, 1)}
              {user.lastName.slice(0, 1)}
            </div>
            <div>
              <div className={styles.fullName}>
                {user.firstName} {user.lastName}
              </div>
              <div className={styles.role}>{ROLE_LABELS[user.role] ?? user.role}</div>
              <div className={styles.email}>{user.email ?? '—'}</div>
            </div>
          </div>

          <h2 className={styles.sectionTitle}>პაროლის შეცვლა</h2>
          <PasswordForm />
        </section>

        {/* ── მშობელი ─────────────────────────────────────────── */}
        {!isStaff && (
          <>
            <PromoRedeem />

            <section className="card">
              <h2 className={styles.sectionTitle}>სწრაფი გადასვლა</h2>
              <div className={styles.links}>
                <Link href="/account">ჩემი კაბინეტი</Link>
                <Link href="/account/child">ბავშვის დამატება</Link>
                <Link href="/calculator">დოზის კალკულატორი</Link>
              </div>
            </section>
          </>
        )}

        {/* ── მშობლების სია ───────────────────────────────────── */}
        {isStaff && (
          <section className="card">
            <h2 className={styles.sectionTitle}>
              მშობლები <span className={styles.count}>({parents?.total ?? 0})</span>
            </h2>

            <UserSearch initial={q} basePath="/profile" />

            {!parents?.items.length ? (
              <p className={styles.empty}>
                {q ? 'ძებნამ შედეგი ვერ იპოვა.' : 'ჯერ არავინაა დარეგისტრირებული.'}
              </p>
            ) : (
              <div className={styles.list}>
                {parents.items.map((item) => (
                  <UserCard
                    key={item.id}
                    user={item}
                    plans={plans ?? []}
                    canManageAccounts={isSuperAdmin}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── შიდა მომხმარებლები ──────────────────────────────── */}
        {isSuperAdmin && (
          <section className="card">
            <h2 className={styles.sectionTitle}>
              შიდა მომხმარებლები{' '}
              <span className={styles.count}>({staff?.items.length ?? 0})</span>
            </h2>

            <CreateStaffForm />

            <div className={styles.list}>
              {(staff?.items ?? []).map((item) => (
                <UserCard key={item.id} user={item} plans={[]} canManageAccounts />
              ))}
            </div>
          </section>
        )}

        {/* ── პრომო კოდები ────────────────────────────────────── */}
        {canManageContent && (
          <section className="card">
            <h2 className={styles.sectionTitle}>
              პრომო კოდები <span className={styles.count}>({promos?.length ?? 0})</span>
            </h2>

            <CreatePromoForm plans={plans ?? []} />

            <div className={styles.list}>
              {(promos ?? []).map((promo) => (
                <PromoRow key={promo.id} promo={promo} />
              ))}
            </div>
          </section>
        )}

        {/* ── წამლების ცნობარი ────────────────────────────────── */}
        {canManageContent && (
          <section className="card">
            <h2 className={styles.sectionTitle}>
              წამლების ცნობარი{' '}
              <span className={styles.count}>({medications?.length ?? 0})</span>
            </h2>
            <p className={styles.hint}>
              კალკულატორი ზუსტად ამ მონაცემებით ითვლის — შეყვანამდე გადაამოწმეთ.
            </p>

            <AddMedication />

            <div className={styles.list}>
              {(medications ?? []).map((medication) => (
                <MedicationRow key={medication.id} medication={medication} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
