'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  deleteAccount,
  purgeAccount,
  setPassword,
  type ActionState,
} from './actions';
import styles from './admin.module.css';

function Submit({ label, busyLabel, danger }: { label: string; busyLabel: string; danger?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={danger ? styles.dangerButton : styles.outlineButton}
    >
      {pending ? busyLabel : label}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className={styles.actionError}>{state.error}</p>;
  if (state.notice) return <p className={styles.actionNotice}>{state.notice}</p>;
  return null;
}

/**
 * ანგარიშის მართვა — იგივე, რაც აპლიკაციაშია.
 *
 * სამი მოქმედება სამი ცალკე ფორმაა: ერთი დიდი ფორმა ნიშნავდა, რომ
 * პაროლის ველის შევსება წაშლის ღილაკზეც აისახებოდა.
 */
export function AccountActions({ userId }: { userId: string }) {
  const [passwordState, passwordAction] = useActionState<ActionState, FormData>(setPassword, {});
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteAccount, {});
  const [purgeState, purgeAction] = useActionState<ActionState, FormData>(purgeAccount, {});

  const [confirming, setConfirming] = useState(false);
  const [purging, setPurging] = useState(false);

  return (
    <div className={styles.accountActions}>
      <h4 className={styles.actionsTitle}>ანგარიშის მართვა</h4>

      <form action={passwordAction} className={styles.inlineForm}>
        <input type="hidden" name="userId" value={userId} />
        <input
          name="password"
          type="password"
          placeholder="ახალი პაროლი"
          autoComplete="new-password"
          className={styles.input}
          minLength={8}
          required
        />
        <Submit label="პაროლის შენახვა" busyLabel="ინახება…" />
      </form>
      <Feedback state={passwordState} />

      {/* ── დაბლოკვა: აღდგენადი ─────────────────────────────────── */}
      {!confirming ? (
        <button className={styles.outlineButton} onClick={() => setConfirming(true)}>
          ანგარიშის წაშლა
        </button>
      ) : (
        <div className={styles.confirmBox}>
          <p className={styles.confirmText}>
            ანგარიში დაიბლოკება და მომხმარებელი ვეღარ შევა. მონაცემები რჩება.
          </p>
          <div className={styles.confirmRow}>
            <button className={styles.outlineButton} onClick={() => setConfirming(false)}>
              გაუქმება
            </button>
            <form action={deleteAction}>
              <input type="hidden" name="userId" value={userId} />
              <Submit label="დიახ, წაშალე" busyLabel="იშლება…" danger />
            </form>
          </div>
        </div>
      )}
      <Feedback state={deleteState} />

      {/* ── სამუდამო წაშლა: შეუქცევადი ───────────────────────────── */}
      {!purging ? (
        <button className={styles.purgeLink} onClick={() => setPurging(true)}>
          სამუდამოდ წაშლა
        </button>
      ) : (
        <form action={purgeAction} className={styles.purgeBox}>
          <input type="hidden" name="userId" value={userId} />
          <p className={styles.confirmText}>
            <strong>შეუქცევადი მოქმედება.</strong> ჩანაწერი ბაზიდან ქრება, ელ. ფოსტა და
            ნომერი თავისუფლდება. გადახდები და ცვლილებების ისტორია რჩება.
          </p>
          <input
            name="confirmation"
            placeholder="დასადასტურებლად აკრიფეთ: წაშლა"
            className={styles.input}
            autoComplete="off"
            required
          />
          <div className={styles.confirmRow}>
            <button type="button" className={styles.outlineButton} onClick={() => setPurging(false)}>
              გაუქმება
            </button>
            <Submit label="სამუდამოდ წაშლა" busyLabel="იშლება…" danger />
          </div>
        </form>
      )}
      <Feedback state={purgeState} />
    </div>
  );
}
