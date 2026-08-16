'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, type LoginState } from '../actions/auth';
import styles from './login.module.css';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'შესვლა…' : 'შესვლა'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>ელ. ფოსტა ან ტელეფონი</span>
        <input
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          required
          className={styles.input}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>პაროლი</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
        />
      </label>

      {!!state.error && <p className={styles.error}>{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
