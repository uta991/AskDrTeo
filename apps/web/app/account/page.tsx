import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { SunLogo } from '../components/Brand';
import { FeatureIcon, type FeatureIconName } from '../components/FeatureIcon';
import { UserMenu } from '../components/UserMenu';
import { ChildAvatar } from './ChildAvatar';
import { NewsFeed, type NewsPost } from './NewsFeed';
import styles from './account.module.css';

export const metadata = { title: 'ჩემი კაბინეტი — AskDrTeo' };

interface Child {
  id: string;
  firstName: string;
  lastName: string | null;
  ageLabel: string;
  stage: string;
  isPreterm: boolean;
  correctedAgeMonths: number;
  avatarUrl: string | null;
}

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // პერსონალს პანელი უფრო გამოადგება
  if (user.role !== 'PARENT') redirect('/admin');

  const [children, news] = await Promise.all([
    apiFetch<Child[]>('/children'),
    apiFetch<NewsPost[]>('/news'),
  ]);

  // პირველი ბავშვი — იგივე ლოგიკა, რაც აპლიკაციის მთავარ ეკრანზე
  const activeChild = children?.[0] ?? null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/account" className={styles.brand}>
          <SunLogo size={44} />
          <span className={styles.name}>AskDrTeo</span>
        </Link>

        <nav className={styles.headerNav}>
          <Link href="/development" className={styles.navLink}>
            განვითარება
          </Link>
          <Link href="/calculator" className={styles.navLink}>
            კალკულატორი
          </Link>
        </nav>

        <UserMenu user={user} />
      </header>

      <div className="container">
        <div className={styles.hello}>
          {!!activeChild && (
            <ChildAvatar
              url={activeChild.avatarUrl}
              name={activeChild.firstName}
              meta={activeChild.ageLabel}
            />
          )}

          <div>
            <h1 className={styles.greeting}>გამარჯობა, {user.firstName}!</h1>
            <p className={styles.subGreeting}>
              {activeChild
                ? `${activeChild.firstName} • ${activeChild.ageLabel}`
                : 'დაამატეთ თქვენი პატარას პროფილი'}
            </p>
          </div>
        </div>

        {/* ── ფუნქციების ბადე — იგივე, რაც აპლიკაციაში ────── */}
        <div className={styles.tiles}>
          {(
            [
              { href: '/emergency', icon: 'sos', color: '#E5484D', label: 'SOS' },
              { href: '/newborn', icon: 'baby', color: '#E86A9B', label: 'ახალშობილი 0–28 დღე' },
              { href: '/development', icon: 'head', color: '#2F6FED', label: 'განვითარება' },
              { href: '/growth', icon: 'chart', color: '#2E9E5B', label: 'ზრდის დღიური' },
              { href: '/vaccinations', icon: 'syringe', color: '#E5484D', label: 'ვაქცინაცია' },
              { href: '/calculator', icon: 'syrup', color: '#0EA5A5', label: 'დოზის კალკულატორი' },
              { href: '/assistant', icon: 'robot', color: '#7C5CFF', label: 'AI ასისტენტი' },
              { href: '/chat', icon: 'chat', color: '#2F6FED', label: 'ჩატი' },
              { href: '/videos', icon: 'play', color: '#E8A400', label: 'ვიდეოთეკა' },
              { href: '/nutrition', icon: 'nutrition', color: '#57A63A', label: 'კვება' },
              { href: '/sleep', icon: 'sleep', color: '#5B67CA', label: 'ძილი' },
              { href: '/travel', icon: 'traveler', color: '#00A3C4', label: 'პატარა მოგზაური' },
            ] as { href: string; icon: FeatureIconName; color: string; label: string }[]
          ).map((tile) => (
            <Link key={tile.href} href={tile.href} className={styles.tile}>
              <FeatureIcon name={tile.icon} color={tile.color} size={30} />
              <span className={styles.tileLabel}>{tile.label}</span>
            </Link>
          ))}
        </div>

        {/* ── შემდეგი ვიზიტი ─────────────────────────────── */}
        <Link href="/booking" className={styles.nextVisit}>
          <span className={styles.nextVisitIcon}>
            <FeatureIcon name="calendar" color="#9C7C00" size={22} />
          </span>

          <span className={styles.nextVisitText}>
            <strong>შემდეგი ვიზიტი</strong>
            <span className={styles.nextVisitMeta}>დაჯავშნე პედიატრთან მისვლა</span>
          </span>

          <span className={styles.nextVisitArrow}>›</span>
        </Link>


        {/* ── სიახლეები ──────────────────────────────────────── */}
        <h2 className={styles.newsTitle}>სიახლეები</h2>

        {!news?.length ? (
          <p className={styles.empty}>ჯერ სიახლეები არ არის.</p>
        ) : (
          <NewsFeed posts={news} />
        )}

        <p className={styles.note}>
          ვიდეოები, რჩევები და კონსულტაცია მობილურ აპლიკაციაშია. აქ ანგარიშსა და
          პაკეტს ხედავთ.
        </p>
      </div>
    </main>
  );
}
