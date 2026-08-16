import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { SunLogo } from './Brand';
import styles from './site-header.module.css';

/**
 * ზედა ნავიგაცია.
 *
 * ღილაკი კონტექსტს მიჰყვება: შესულს „პანელი" ხვდება, შეუსვლელს —
 * „შესვლა". ასე ადმინს ყოველ ჯერზე login-ის გავლა აღარ სჭირდება.
 */
export async function SiteHeader() {
  const user = await getSessionUser();
  const isStaff = !!user && user.role !== 'PARENT';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <SunLogo size={44} />
          <span className={styles.name}>AskDrTeo</span>
        </Link>

        <nav className={styles.nav}>
          <a href="#about">ჩვენ შესახებ</a>
          <a href="#features">შესაძლებლობები</a>
          <a href="#stages">ასაკები</a>
          {/* პაკეტები მხოლოდ შესულს ეჩვენება — სექციაც მაშინ არსებობს */}
          {!!user && <a href="#plans">პაკეტები</a>}
        </nav>

        <div className={styles.actions}>
          {!user && (
            <Link href="/login" className={styles.primary}>
              შესვლა
            </Link>
          )}
          {!!user && isStaff && (
            <Link href="/admin" className={styles.primary}>
              სამართავი პანელი
            </Link>
          )}
          {!!user && !isStaff && (
            <Link href="/account" className={styles.primary}>
              ჩემი კაბინეტი
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
