'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createStaff, type ActionState } from '../actions';
import styles from '../admin.module.css';

const ROLES = [
  { value: 'PARENT', label: 'მშობელი' },
  { value: 'OPERATOR', label: 'ოპერატორი' },
  { value: 'ADMIN', label: 'ადმინისტრატორი' },
  { value: 'SUPER_ADMIN', label: 'მთავარი ადმინისტრატორი' },
];

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'იქმნება…' : 'ანგარიშის შექმნა'}
    </button>
  );
}

/** ანგარიშის შექმნა — SMS დადასტურების გარეშე, როგორც აპლიკაციაში. */
export function CreateStaffForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(createStaff, {});

  if (!open) {
    return (
      <button className={styles.outlineButton} onClick={() => setOpen(true)}>
        + ახალი ანგარიში
      </button>
    );
  }

  return (
    <form action={formAction} className={styles.staffForm}>
      <div className={styles.formRow}>
        <input name="firstName" placeholder="სახელი" className={styles.input} required />
        <input name="lastName" placeholder="გვარი" className={styles.input} required />
      </div>

      <input
        name="email"
        type="email"
        placeholder="ელ. ფოსტა"
        autoCapitalize="none"
        className={styles.input}
        required
      />

      <input
        name="password"
        type="password"
        placeholder="პაროლი (მინ. 8 სიმბოლო)"
        autoComplete="new-password"
        className={styles.input}
        minLength={8}
        required
      />

      <select name="role" className={styles.input} defaultValue="OPERATOR">
        {ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>

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
