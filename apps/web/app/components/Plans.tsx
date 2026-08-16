import styles from '../page.module.css';

interface PlanPrice {
  amountMinor: number;
  currency: string;
  interval: 'MONTH' | 'YEAR' | 'ONE_TIME';
}

interface PlanFeature {
  key: string;
  name: string;
  value: string | null;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isFree: boolean;
  badge: string | null;
  highlight: boolean;
  prices: PlanPrice[];
  features: PlanFeature[];
}

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

/**
 * პაკეტები API-დან.
 *
 * სიაში ხელით არაფერი წერია — ფასები და ფუნქციები ბაზიდან მოდის.
 * Super Admin-ის ცვლილება ვებზეც მაშინვე აისახება, ისევე როგორც
 * აპლიკაციაში.
 */
async function fetchPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_URL}/plans`, {
      // ფასი იშვიათად იცვლება; წუთიანი ქეში backend-ს ზედმეტად არ ტვირთავს
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Plan[];
  } catch {
    // API გამორთულია — გვერდი მაინც უნდა აეწყოს
    return [];
  }
}

function formatPrice(price: PlanPrice | undefined): string {
  if (!price) return '0 ₾';
  const symbol = price.currency === 'GEL' ? '₾' : price.currency;
  return `${(price.amountMinor / 100).toFixed(2)} ${symbol}`;
}

export async function Plans() {
  const plans = await fetchPlans();

  if (!plans.length) {
    return <p className={styles.sectionLead}>პაკეტები დროებით მიუწვდომელია</p>;
  }

  return (
    <div className={styles.planGrid}>
      {plans.map((plan) => {
        const monthly = plan.prices.find((p) => p.interval === 'MONTH') ?? plan.prices[0];

        return (
          <article
            key={plan.id}
            className={`card ${styles.planCard} ${plan.highlight ? styles.planHighlight : ''}`}
          >
            {!!plan.badge && <span className={styles.planBadge}>{plan.badge}</span>}

            <h3 className={styles.planName}>{plan.name}</h3>
            {!!plan.description && <p className={styles.planDesc}>{plan.description}</p>}

            <p className={styles.planPrice}>
              {plan.isFree ? 'უფასო' : formatPrice(monthly)}
              {!plan.isFree && <span className={styles.planPeriod}> / თვე</span>}
            </p>

            <ul className={styles.planFeatures}>
              {plan.features.slice(0, 6).map((feature) => (
                <li key={feature.key}>
                  {feature.name}
                  {feature.value && feature.value !== 'all' ? ` · ${feature.value}` : ''}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
