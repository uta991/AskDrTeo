'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { redeemPromo, type RedeemState } from './actions';
import styles from './account.module.css';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'მოწმდება…' : 'გააქტიურება'}
    </button>
  );
}

/** პრომო კოდის ველი — იგივე, რაც აპლიკაციის პროფილზეა. */
export function PromoRedeem() {
  const [state, formAction] = useActionState<RedeemState, FormData>(redeemPromo, {});

  return (
    <section className="card">
      <h2 className={styles.cardTitle}>პრომო კოდი</h2>
      <p className={styles.promoHint}>
        გაქვთ კოდი? შეიყვანეთ და პაკეტი ან ფასდაკლება მაშინვე გააქტიურდება.
      </p>

      <form action={formAction} className={styles.promoForm}>
        <input
          name="code"
          placeholder="მაგ. WELCOME20"
          className={styles.promoInput}
          autoCapitalize="characters"
          autoComplete="off"
          required
        />
        <Submit />
      </form>

      {!!state.error && <p className={styles.promoError}>{state.error}</p>}
      {!!state.notice && <p className={styles.promoNotice}>{state.notice}</p>}
    </section>
  );
}
