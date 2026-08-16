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

// მსგავსი სიმბოლოები გამოტოვებულია: 0/O და 1/I ხმით კარნახისას ერევა
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * შემთხვევითი კოდი, სურვილისამებრ სიტყვიანი პრეფიქსით.
 *
 * `crypto.getRandomValues` განზრახ — `Math.random` მოკლე კოდებზე
 * თვალშისაცემად მეორდება.
 */
function generateCode(word: string): string {
  const length = word ? 4 : 8;
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const random = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');

  const prefix = word
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);

  return prefix ? `${prefix}${random}` : random;
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
  const [code, setCode] = useState('');
  const [word, setWord] = useState('');
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
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="კოდი (მაგ. WELCOME20)"
        className={`${styles.input} ${styles.codeField}`}
        autoCapitalize="characters"
        autoComplete="off"
        required
      />

      <div className={styles.generatorRow}>
        <input
          value={word}
          onChange={(event) => setWord(event.target.value)}
          placeholder="სიტყვა (არასავალდებულო)"
          className={styles.input}
          autoComplete="off"
        />
        <button
          type="button"
          className={styles.outlineButton}
          onClick={() => setCode(generateCode(word.trim()))}
        >
          გენერაცია
        </button>
      </div>
      <p className={styles.miniLabel}>
        სიტყვის გარეშე — 8 შემთხვევითი სიმბოლო; სიტყვით — სიტყვა და 4 სიმბოლო.
      </p>

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
          <span className={styles.miniLabel}>დაწყება (ცარიელი = მაშინვე)</span>
          <input name="validFrom" type="date" className={styles.input} />
        </label>

        <label className={styles.miniField}>
          <span className={styles.miniLabel}>მოქმედების ბოლო დღე</span>
          <input name="validUntil" type="date" className={styles.input} />
        </label>

        <label className={styles.miniField}>
          <span className={styles.miniLabel}>რამდენჯერ იმუშაოს (ცარიელი = ულიმიტო)</span>
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
