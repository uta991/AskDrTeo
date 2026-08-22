import Link from 'next/link';
import { SunLogo } from '../components/Brand';
import { ChatTabBadge } from './ChatTabBadge';
import { NotificationBell } from '../components/NotificationBell';
import { UserMenu } from '../components/UserMenu';
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
  active:
    | 'dashboard'
    | 'users'
    | 'news'
    | 'chat'
    | 'appointments'
    | 'videos'
    | 'vaccines'
    | 'promo'
    | 'medications'
    | 'staff'
    | 'profile';
}) {
  return (
    <header className={styles.header}>
      <Link href="/admin" className={styles.brand}>
        <SunLogo size={48} />
        <div>
          <strong>AskDrTeo</strong>
          <div className={styles.role}>{ROLE_LABELS[user.role] ?? user.role}</div>
        </div>
      </Link>

      <nav className={styles.tabs}>
        <Link href="/admin" className={active === 'dashboard' ? styles.tabActive : styles.tab}>
          დაშბორდი
        </Link>
        {/* სიახლეს ოპერატორიც წერს — ვიდეოს მიბმა კი ადმინის უფლებაა */}
        <Link href="/admin/news" className={active === 'news' ? styles.tabActive : styles.tab}>
          სიახლეები
        </Link>

        {/* ოპერატორის ძირითადი სამუშაო ადგილი — წაუკითხავი წითლად ჩანს */}
        <ChatTabBadge active={active === 'chat'} />

        <Link
          href="/admin/appointments"
          className={active === 'appointments' ? styles.tabActive : styles.tab}
        >
          ვიზიტები
        </Link>

        {/* პრომო კოდები ოპერატორს არ ეკუთვნის — მისი საქმე ჩატია */}
        <Link href="/development" className={styles.tab}>
          განვითარება
        </Link>

        <Link href="/calculator" className={styles.tab}>
          კალკულატორი
        </Link>

        <Link href="/profile" className={active === 'profile' ? styles.tabActive : styles.tab}>
          პროფილი
        </Link>

        {/* ცნობარის რედაქტირება ოპერატორს არ ეკუთვნის — დოზირებაა */}
      </nav>

      <div className={styles.headerRight}>
        {/* ჩატში წერენ თუ ვიზიტს ითხოვენ — ოპერატორმა მაშინვე უნდა დაინახოს */}
        <NotificationBell isStaff />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
