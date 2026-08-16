import Link from 'next/link';
import { logout } from '../actions/auth';
import { SunLogo } from '../components/Brand';
import type { SessionUser } from '@/lib/session';
import styles from './admin.module.css';

const ROLE_LABELS: Record<string, string> = {
  OPERATOR: 'ოპერატორი',
  ADMIN: 'ადმინისტრატორი',
  SUPER_ADMIN: 'მთავარი ადმინისტრატორი',
};

/**
 * პანელის ზედა ზოლი — იგივე ტაბები, რაც აპლიკაციაშია.
 *
 * „პერსონალი" მხოლოდ Super Admin-ს უჩანს: ანგარიშების მართვა მისი
 * უფლებაა და ცარიელი გვერდი ადმინს მხოლოდ დააბნევდა.
 */
export function AdminNav({
  user,
  active,
}: {
  user: SessionUser;
  active: 'dashboard' | 'users' | 'promo' | 'staff';
}) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <SunLogo size={48} />
        <div>
          <strong>AskDrTeo</strong>
          <div className={styles.role}>{ROLE_LABELS[user.role] ?? user.role}</div>
        </div>
      </div>

      <nav className={styles.tabs}>
        <Link href="/admin" className={active === 'dashboard' ? styles.tabActive : styles.tab}>
          დაშბორდი
        </Link>
        <Link href="/admin/users" className={active === 'users' ? styles.tabActive : styles.tab}>
          მომხმარებლები
        </Link>
        {/* პრომო კოდები ოპერატორს არ ეკუთვნის — მისი საქმე ჩატია */}
        {user.role !== 'OPERATOR' && (
          <Link href="/admin/promo" className={active === 'promo' ? styles.tabActive : styles.tab}>
            პრომო კოდები
          </Link>
        )}
        {user.role === 'SUPER_ADMIN' && (
          <Link href="/admin/staff" className={active === 'staff' ? styles.tabActive : styles.tab}>
            პერსონალი
          </Link>
        )}
      </nav>

      <div className={styles.headerRight}>
        <span className={styles.userName}>
          {user.firstName} {user.lastName}
        </span>
        <form action={logout}>
          <button className={styles.logout}>გასვლა</button>
        </form>
      </div>
    </header>
  );
}
