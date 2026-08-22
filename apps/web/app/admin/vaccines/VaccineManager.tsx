'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addVaccine, deleteVaccine, type Vaccine, type VaccineState } from './actions';
import styles from '../admin.module.css';

/** ასაკი წარწერად — კალენდარი ვიზიტებად იკითხება. */
function ageLabel(months: number): string {
  if (months === 0) return 'დაბადებისთანავე';
  if (months < 12) return `${months} თვე`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} წელი` : `${years} წელი ${rest} თვე`;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'ინახება…' : label}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.purgeLink} disabled={pending}>
      {pending ? 'იშლება…' : 'წაშლა'}
    </button>
  );
}

export function VaccineManager({ vaccines }: { vaccines: Vaccine[] }) {
  const [addState, addAction] = useActionState<VaccineState, FormData>(addVaccine, {});
  const [deleteState, deleteAction] = useActionState<VaccineState, FormData>(deleteVaccine, {});

  return (
    <>
      <form action={addAction} className={styles.newsForm}>
        <div className={styles.formRow}>
          <label className={styles.miniField}>
            <span className={styles.miniLabel}>კოდი</span>
            <input name="code" placeholder="MMR_1" className={styles.input} required />
          </label>

          <label className={styles.miniField}>
            <span className={styles.miniLabel}>ასაკი (თვე)</span>
            <input name="ageMonths" type="number" min={0} max={216} className={styles.input} required />
          </label>

          <label className={styles.miniField}>
            <span className={styles.miniLabel}>დოზის ნომერი</span>
            <input name="doseNumber" type="number" min={1} max={10} defaultValue={1} className={styles.input} />
          </label>
        </div>

        <input name="name" placeholder="დასახელება" className={styles.input} required />

        <textarea
          name="description"
          placeholder="რისგან იცავს — ერთი წინადადებით მშობლისთვის"
          className={styles.textarea}
          rows={2}
        />

        {!!addState.error && <p className={styles.actionError}>{addState.error}</p>}
        {!!addState.notice && <p className={styles.actionNotice}>{addState.notice}</p>}

        <Submit label="კალენდარში დამატება" />
      </form>

      {!!deleteState.error && <p className={styles.actionError}>{deleteState.error}</p>}

      <div className={styles.userList}>
        {vaccines.map((vaccine) => (
          <article key={vaccine.id} className={styles.newsCard}>
            <div className={styles.newsHead}>
              <strong>{vaccine.name}</strong>
              <span className={styles.badgeOff}>{ageLabel(vaccine.ageMonths)}</span>
            </div>

            {!!vaccine.description && <p className={styles.newsBody}>{vaccine.description}</p>}

            <div className={styles.promoMeta}>
              <span>{vaccine.code}</span>
              <span>{vaccine.doseNumber} დოზა</span>
            </div>

            <form action={deleteAction}>
              <input type="hidden" name="id" value={vaccine.id} />
              <DeleteButton />
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
