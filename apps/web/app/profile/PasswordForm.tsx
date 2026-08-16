'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { changePassword, type ProfileState } from './actions';
import styles from './profile.module.css';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'ინახება…' : 'პაროლის შეცვლა'}
    </button>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState<ProfileState, FormData>(changePassword, {});

  return (
    <form action={formAction} className={styles.form}>
      <input
        name="currentPassword"
        type="password"
        placeholder="მიმდინარე პაროლი"
        autoComplete="current-password"
        className={styles.input}
        required
      />
      <input
        name="newPassword"
        type="password"
        placeholder="ახალი პაროლი"
        autoComplete="new-password"
        className={styles.input}
        required
      />
      <input
        name="confirmPassword"
        type="password"
        placeholder="ახალი პაროლის გამეორება"
        autoComplete="new-password"
        className={styles.input}
        required
      />

      {!!state.error && <p className={styles.error}>{state.error}</p>}
      {!!state.notice && <p className={styles.notice}>{state.notice}</p>}

      <Submit />
    </form>
  );
}
