import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { planColor } from '@/lib/entitlements';
import { SunLogo } from '../components/Brand';
import { UserMenu } from '../components/UserMenu';
import { PromoRedeem } from './PromoRedeem';
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
}

interface Entitlements {
  planCode: string | null;
  planName: string | null;
  periodEnd: string | null;
  features: Record<string, { name: string; enabled: boolean; value: string | null }>;
}

const STAGE_LABELS: Record<string, string> = {
  NEWBORN: 'ახალშობილი',
  INFANT: 'ჩვილი',
  TODDLER: 'პატარა ბავშვი',
  PRESCHOOL: 'სკოლამდელი ასაკი',
  SCHOOL: 'სკოლის ასაკი',
  TEEN: 'მოზარდობა',
};

const PLAN_LABELS: Record<string, string> = {
  free: 'უფასო',
  standard: 'სტანდარტული',
  premium: 'პრემიუმი',
  unlimited: 'ულიმიტო',
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // პერსონალს პანელი უფრო გამოადგება
  if (user.role !== 'PARENT') redirect('/admin');

  const [children, entitlements, news] = await Promise.all([
    apiFetch<Child[]>('/children'),
    apiFetch<Entitlements>('/me/entitlements'),
    apiFetch<NewsPost[]>('/news'),
  ]);

  const planLabel = entitlements?.planCode
    ? (PLAN_LABELS[entitlements.planCode] ?? entitlements.planName)
    : '—';

  const activeFeatures = Object.values(entitlements?.features ?? {}).filter((f) => f.enabled);

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
        <h1 className={styles.greeting}>გამარჯობა, {user.firstName}!</h1>
        <p className={styles.subGreeting}>
          {activeChild
            ? `დღეს როგორ გრძნობს თავს ${activeChild.firstName}?`
            : 'დაამატეთ თქვენი პატარას პროფილი'}
        </p>

        <div className={styles.grid}>
          {/* ── ბავშვები ─────────────────────────────────── */}
          <section className="card">
            <h2 className={styles.cardTitle}>ბავშვის პროფილები</h2>

            {!children?.length ? (
              <p className={styles.empty}>
                ჯერ არ დაგიმატებიათ — ასაკობრივი რჩევებისთვის პროფილი საჭიროა.
              </p>
            ) : (
              <ul className={styles.childList}>
                {children.map((child) => (
                  <li key={child.id} className={styles.child}>
                    <strong>
                      {child.firstName} {child.lastName ?? ''}
                    </strong>
                    <div className={styles.childMeta}>
                      {child.ageLabel} · {STAGE_LABELS[child.stage] ?? child.stage}
                    </div>
                    {child.isPreterm && (
                      <div className={styles.preterm}>
                        კორექტირებული ასაკი: {child.correctedAgeMonths} თვე
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <Link href="/account/child" className={styles.addChild}>
              + ბავშვის დამატება
            </Link>
          </section>

          {/* ── პაკეტი ───────────────────────────────────── */}
          <section className="card">
            <h2 className={styles.cardTitle}>ჩემი პაკეტი</h2>
            <p className={styles.plan} style={{ color: planColor(entitlements?.planCode) }}>
              {planLabel}
            </p>

            {!!entitlements?.periodEnd && (
              <p className={styles.childMeta}>ვადა: {entitlements.periodEnd.slice(0, 10)}</p>
            )}

            <ul className={styles.features}>
              {activeFeatures.slice(0, 8).map((feature) => (
                <li key={feature.name}>
                  {feature.name}
                  {feature.value && feature.value !== 'all' ? ` · ${feature.value}` : ''}
                </li>
              ))}
            </ul>

            <Link href="/plans" className={styles.link}>
              ყველა პაკეტის ნახვა
            </Link>
          </section>

          <PromoRedeem />
        </div>

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
