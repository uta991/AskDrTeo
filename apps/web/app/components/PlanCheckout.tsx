'use client';

import { useState, useTransition } from 'react';
import { startCheckout } from '../actions/payments';
import styles from './plan-checkout.module.css';

/**
 * პაკეტის ყიდვის ღილაკი.
 *
 * ბარათის მონაცემები ჩვენთან არ შემოდის — ღილაკი მხოლოდ ბანკის
 * გადახდის გვერდზე გადაგვიყვანს. ამიტომ არც ბარათის ნომერი, არც CVV
 * არსად ჩვენს სისტემაში არ ინახება.
 */
export function PlanCheckout({
  planCode,
  color,
  label,
  yearLabel,
  className,
}: {
  planCode: string;
  color: string;
  label: string;
  /** წლიური ფასის წარწერა — თუ ასეთი ფასი პაკეტს აქვს */
  yearLabel?: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const go = (interval: 'MONTH' | 'YEAR') => {
    setError(null);

    startTransition(async () => {
      const result = await startCheckout(planCode, interval);

      if (result.url) {
        // ბანკის გვერდი იმავე ჩანართში იხსნება — pop-up ბლოკერი აქ ხელს არ შეგვიშლის
        window.location.href = result.url;
        return;
      }

      setError(result.error ?? 'გადახდა ვერ დაიწყო');
    });
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`btn ${className ?? ''}`}
        style={{ background: color, borderColor: color, color: '#ffffff' }}
        disabled={pending}
        onClick={() => go('MONTH')}
      >
        {pending ? 'იხსნება…' : label}
      </button>

      {!!yearLabel && (
        <button
          type="button"
          className={styles.yearly}
          style={{ color }}
          disabled={pending}
          onClick={() => go('YEAR')}
        >
          {yearLabel}
        </button>
      )}

      {!!error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
