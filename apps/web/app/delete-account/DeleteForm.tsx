'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteOwnAccount, type DeleteAccountState } from './actions';
import styles from '../profile/profile.module.css';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'იშლება…' : 'ანგარიშის სამუდამოდ წაშლა'}
    </button>
  );
}

export function DeleteForm() {
  const [state, formAction] = useActionState<DeleteAccountState, FormData>(deleteOwnAccount, {});

  return (
    <form action={formAction} className={styles.form}>
      <label htmlFor="confirm">დასადასტურებლად ჩაწერეთ სიტყვა „წაშლა"</label>
      <input id="confirm" name="confirm" autoComplete="off" className={styles.input} required />

      {!!state.error && <p className={styles.error}>{state.error}</p>}

      <Submit />
    </form>
  );
}
