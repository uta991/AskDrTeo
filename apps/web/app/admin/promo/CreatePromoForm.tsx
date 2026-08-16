'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPromo, type ActionState } from '../actions';
import styles from '../admin.module.css';

interface PlanOption {
  id: string;
  code: string;
  name: string;
}

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'იქმნება…' : 'კოდის შექმნა'}
    </button>
  );
}

/**
 * კოდის შექმნა.
 *
 * სახეობის მიხედვით ველები იცვლება: ორივეს ერთდროულად ჩვენება
 * მხოლოდ დააბნევდა — ფასდაკლების კოდს დღეები არ სჭირდება.
 */
export function CreatePromoForm({ plans }: { plans: PlanOption[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'DISCOUNT' | 'FREE_PLAN'>('DISCOUNT');
  const [state, formAction] = useActionState<ActionState, FormData>(createPromo, {});

  if (!open) {
    return (
      <button className={styles.outlineButton} onClick={() => setOpen(true)}>
        + ახალი პრომო კოდი
      </button>
    );
  }

  return (
    <form action={formAction} className={styles.staffForm}>
      <input
        name="code"
        placeholder="კოდი (მაგ. WELCOME20)"
        className={`${styles.input} ${styles.codeField}`}
        autoCapitalize="characters"
        autoComplete="off"
        required
      />

      <div className={styles.typeRow}>
        <label className={type === 'DISCOUNT' ? styles.typeActive : styles.typeOption}>
          <input
            type="radio"
            name="type"
            value="DISCOUNT"
            checked={type === 'DISCOUNT'}
            onChange={() => setType('DISCOUNT')}
          />
          ფასდაკლება
        </label>

        <label className={type === 'FREE_PLAN' ? styles.typeActive : styles.typeOption}>
          <input
            type="radio"
            name="type"
            value="FREE_PLAN"
            checked={type === 'FREE_PLAN'}
            onChange={() => setType('FREE_PLAN')}
          />
          უფასო პაკეტი
        </label>
      </div>

      {type === 'DISCOUNT' ? (
        <input
          name="discountPercent"
          type="number"
          min={1}
          max={100}
          placeholder="ფასდაკლება პროცენტში"
          className={styles.input}
          required
        />
      ) : (
        <div className={styles.formRow}>
          <select name="planCode" className={styles.input} required defaultValue="">
            <option value="" disabled>
              აირჩიეთ პაკეტი
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.code}>
                {plan.name}
              </option>
            ))}
          </select>

          <input
            name="freeDays"
            type="number"
            min={1}
            placeholder="დღეების რაოდენობა"
            className={styles.input}
            required
          />
        </div>
      )}

      <input
        name="description"
        placeholder="აღწერა (არასავალდებულო)"
        className={styles.input}
        autoComplete="off"
      />

      <div className={styles.formRow}>
        <label className={styles.miniField}>
          <span className={styles.miniLabel}>მოქმედების ბოლო დღე</span>
          <input name="validUntil" type="date" className={styles.input} />
        </label>

        <label className={styles.miniField}>
          <span className={styles.miniLabel}>ლიმიტი (ცარიელი = ულიმიტო)</span>
          <input name="maxRedemptions" type="number" min={1} className={styles.input} />
        </label>
      </div>

      {!!state.error && <p className={styles.actionError}>{state.error}</p>}
      {!!state.notice && <p className={styles.actionNotice}>{state.notice}</p>}

      <div className={styles.confirmRow}>
        <button type="button" className={styles.outlineButton} onClick={() => setOpen(false)}>
          გაუქმება
        </button>
        <Submit />
      </div>
    </form>
  );
}
