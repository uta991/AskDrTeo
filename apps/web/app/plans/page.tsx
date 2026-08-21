import Link from 'next/link';
import { apiFetch, getSessionUser } from '@/lib/session';
import { getEntitlements, planColor } from '@/lib/entitlements';
import { SunLogo } from '../components/Brand';
import styles from './plans.module.css';

export const metadata = { title: 'პაკეტები — AskDrTeo' };

interface PlanFeature {
  key: string;
  name: string;
  value: string | null;
  unit: string | null;
}

interface Price {
  currency: string;
  amountMinor: number;
  interval: 'MONTH' | 'YEAR';
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isFree: boolean;
  badge: string | null;
  highlight: boolean;
  trialDays: number;
  prices: Price[];
  features: PlanFeature[];
}

/** თეთრები ლარად — ფულთან მცურავი წერტილი არასდროს. */
function priceLabel(prices: Price[]): { month: string; year: string | null } {
  const month = prices.find((p) => p.interval === 'MONTH');
  const year = prices.find((p) => p.interval === 'YEAR');

  return {
    month: month ? `${(month.amountMinor / 100).toFixed(0)} ₾ / თვე` : 'უფასო',
    year: year ? `${(year.amountMinor / 100).toFixed(0)} ₾ წელიწადში` : null,
  };
}

/** ლიმიტის მნიშვნელობა ადამიანურ ენაზე. */
function featureLabel(feature: PlanFeature): string {
  // ვიზიტი თვეზეა მიბმული — მარტო რიცხვი გაუგებარია
  if (feature.key === 'monthly_free_visit') {
    return `${feature.name}: თვეში ${feature.value ?? 1}`;
  }

  if (!feature.value) return feature.name;
  if (feature.value === 'unlimited') return `${feature.name}: ულიმიტო`;
  if (feature.value === 'free_only') return `${feature.name}: უფასო ნაწილი`;
  if (feature.value === 'all') return `${feature.name}: სრული`;

  return `${feature.name}: ${feature.value}${feature.unit === 'MB' ? ' MB' : ''}`;
}

export default async function PlansPage() {
  const user = await getSessionUser();

  const [plans, entitlements] = await Promise.all([
    apiFetch<Plan[]>('/plans'),
    user ? getEntitlements() : Promise.resolve(null),
  ]);

  const current = entitlements?.planCode ?? null;

  return (
    <main className={styles.page}>
      <Link href={user ? '/account' : '/'} className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.head}>
        <SunLogo size={44} />
        <h1 className={styles.title}>პაკეტები</h1>
        <p className={styles.subtitle}>
          განვითარების მონიტორინგი უფასოშიც არის. ფასიანი პაკეტები ზრდის
          დინამიკას, დოზის კალკულატორსა და AI ასისტენტს ამატებს.
        </p>
      </div>

      <div className={styles.grid}>
        {(plans ?? []).map((plan) => {
          const price = priceLabel(plan.prices);
          const isCurrent = plan.code === current;

          return (
            <section
              key={plan.id}
              className={styles.card}
              style={{ borderColor: planColor(plan.code) }}
            >
              {!!plan.badge && (
                <span className={styles.badge} style={{ background: planColor(plan.code) }}>
                  {plan.badge}
                </span>
              )}

              <h2 className={styles.planName} style={{ color: planColor(plan.code) }}>
                {plan.name}
              </h2>
              <p className={styles.price}>{price.month}</p>
              {!!price.year && <p className={styles.priceYear}>{price.year}</p>}

              {!!plan.description && <p className={styles.description}>{plan.description}</p>}

              <ul className={styles.features}>
                {plan.features.map((feature) => (
                  <li key={feature.key} className={styles.feature}>
                    <span className={styles.check} style={{ color: planColor(plan.code) }}>
                      ✓
                    </span>
                    {featureLabel(feature)}
                  </li>
                ))}
              </ul>

              {plan.trialDays > 0 && !isCurrent && (
                <p className={styles.trial}>პირველი {plan.trialDays} დღე უფასოდ</p>
              )}

              {isCurrent ? (
                <span
                  className={styles.currentTag}
                  style={{ background: planColor(plan.code), color: '#ffffff' }}
                >
                  თქვენი პაკეტი
                </span>
              ) : (
                <Link
                  href={user ? '/account' : '/register'}
                  className={`btn ${styles.cta}`}
                  style={{
                    background: planColor(plan.code),
                    borderColor: planColor(plan.code),
                    color: '#ffffff',
                  }}
                >
                  {plan.isFree ? 'დაწყება' : 'პაკეტის აღება'}
                </Link>
              )}
            </section>
          );
        })}
      </div>

      <p className={styles.note}>
        გადახდის მეთოდის დასაკავშირებლად დაგვიკავშირდით — გამოწერას ხელით
        გააქტიურებთ ჩვენი გუნდი.
      </p>
    </main>
  );
}
