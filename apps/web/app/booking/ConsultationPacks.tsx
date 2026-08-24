'use client';

import { useState, useTransition } from 'react';
import { startPackCheckout } from './actions';
import styles from './booking.module.css';

export interface PackOffer {
  code: string;
  name: string;
  chats: number;
  periodLabel: string;
  description: string;
  highlight: boolean;
  price: string;
}

export interface PacksOverview {
  offers: PackOffer[];
  active: { code: string; remaining: number; limit: number; expiresAt: string }[];
  remaining: number;
}

/**
 * კონსულტაციის ლიმიტები.
 *
 * ჩნდება მაშინ, როცა თვის უფასო ვიზიტი ამოწურულია: ამ მომენტში
 * მშობელს კონკრეტული საჭიროება აქვს და პაკეტების საერთო ვიტრინაზე
 * გაგზავნა მას გზიდან უხვევდა.
 */
export function ConsultationPacks({ overview }: { overview: PacksOverview }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const buy = (code: string) => {
    setError(null);
    setBusy(code);

    startTransition(async () => {
      const result = await startPackCheckout(code);

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      setError(result.error ?? 'გადახდა ვერ დაიწყო');
      setBusy(null);
    });
  };

  return (
    <section className={styles.packs}>
      <h3 className={styles.packsTitle}>გსურთ ექიმთან საუბრის გაგრძელება?</h3>
      <p className={styles.packsNote}>
        თვის უფასო ვიზიტი ამოწურულია. აირჩიეთ კონსულტაციის ლიმიტი და
        ექიმთან საუბარი დაუყოვნებლივ გააგრძელეთ.
      </p>

      {overview.remaining > 0 && (
        <p className={styles.packsActive}>
          თქვენ უკვე გაქვთ {overview.remaining} საუბრის ნაშთი.
        </p>
      )}

      <div className={styles.packGrid}>
        {overview.offers.map((offer) => (
          <article
            key={offer.code}
            className={`${styles.pack} ${offer.highlight ? styles.packHighlight : ''}`}
          >
            {offer.highlight && <span className={styles.packBadge}>პოპულარული</span>}

            <h4 className={styles.packName}>{offer.name}</h4>
            <p className={styles.packPrice}>{offer.price}</p>
            <p className={styles.packPeriod}>{offer.periodLabel}</p>
            <p className={styles.packDesc}>{offer.description}</p>

            <button
              type="button"
              className={`btn ${styles.packButton}`}
              disabled={busy !== null}
              onClick={() => buy(offer.code)}
            >
              {busy === offer.code ? 'იხსნება…' : 'გამოწერა'}
            </button>
          </article>
        ))}
      </div>

      {!!error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
