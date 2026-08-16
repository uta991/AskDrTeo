'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { verifyOtp, type VerifyState } from '../actions/auth';
import styles from '../login/login.module.css';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'მოწმდება…' : 'დადასტურება'}
    </button>
  );
}

export function VerifyForm({ destination }: { destination: string }) {
  const [state, formAction] = useActionState<VerifyState, FormData>(verifyOtp, {});

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="destination" value={destination} />

      <label className={styles.field}>
        <span className={styles.label}>დადასტურების კოდი</span>
        <input
          name="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          className={`${styles.input} ${styles.codeInput}`}
          required
        />
      </label>

      {!!state.error && <p className={styles.error}>{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
