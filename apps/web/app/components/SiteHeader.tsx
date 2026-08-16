import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { SunLogo } from './Brand';
import { UserMenu } from './UserMenu';
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
        {/* შესულ მომხმარებელს ლოგო თავის პანელში აბრუნებს, არა landing-ზე */}
        <Link href={!user ? '/' : isStaff ? '/admin' : '/account'} className={styles.brand}>
          <SunLogo size={44} />
          <span className={styles.name}>AskDrTeo</span>
        </Link>

        <nav className={styles.nav}>
          <a href="#about">ჩვენ შესახებ</a>
          <a href="#features">შესაძლებლობები</a>
          <a href="#stages">ასაკები</a>
          {/* პაკეტები მხოლოდ შესულს ეჩვენება — სექციაც მაშინ არსებობს */}
          {!!user && <a href="#plans">პაკეტები</a>}
          {/* დოზირება სამედიცინო ინფორმაციაა — მხოლოდ შესულს */}
          {!!user && <Link href="/calculator">კალკულატორი</Link>}
        </nav>

        <div className={styles.actions}>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
