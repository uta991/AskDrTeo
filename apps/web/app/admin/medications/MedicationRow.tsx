'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Medication } from '@/lib/medications';
import { deleteMedication, type MedicationState } from './actions';
import { MedicationForm } from './MedicationForm';
import styles from '../admin.module.css';

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.dangerButton} disabled={pending}>
      {pending ? 'იშლება…' : 'დიახ, წაშალე'}
    </button>
  );
}

export function MedicationRow({ medication }: { medication: Medication }) {
  const [state, action] = useActionState<MedicationState, FormData>(deleteMedication, {});
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const rule =
    medication.dosingType === 'PER_KG'
      ? medication.mgPerKgMin === medication.mgPerKgMax
        ? `${medication.mgPerKgMin} მგ/კგ`
        : `${medication.mgPerKgMin}–${medication.mgPerKgMax} მგ/კგ`
      : `${medication.ageBands?.length ?? 0} ასაკობრივი საფეხური`;

  const interval =
    medication.intervalHoursMin === medication.intervalHoursMax
      ? `${medication.intervalHoursMin} სთ-ში ერთხელ`
      : `${medication.intervalHoursMin}–${medication.intervalHoursMax} სთ-ში ერთხელ`;

  return (
    <article className={styles.newsCard}>
      <div className={styles.newsHead}>
        <strong>{medication.name}</strong>
        <span className={medication.isActive ? styles.badgeActive : styles.badgeOff}>
          {medication.isActive ? 'აქტიური' : 'გამორთული'}
        </span>
      </div>

      <div className={styles.promoMeta}>
        <span>{rule}</span>
        <span>{interval}</span>
        <span>დღეში მაქს. {medication.maxDailyMg} მგ</span>
        <span>{medication.minAgeMonths} თვიდან</span>
        <span>{medication.minWeightKg} კგ-დან</span>
        <span>{medication.concentrations.length} კონცენტრაცია</span>
      </div>

      {!!medication.note && <p className={styles.newsBody}>{medication.note}</p>}

      <div className={styles.confirmRow}>
        <button className={styles.outlineButton} onClick={() => setEditing(!editing)}>
          {editing ? 'დახურვა' : 'რედაქტირება'}
        </button>

        {!confirming && (
          <button className={styles.purgeLink} onClick={() => setConfirming(true)}>
            წაშლა
          </button>
        )}
      </div>

      {confirming && (
        <div className={styles.confirmBox}>
          <p className={styles.confirmText}>
            კალკულატორიდან ქრება. ისტორია და ცვლილებების ჟურნალი რჩება.
          </p>
          <div className={styles.confirmRow}>
            <button className={styles.outlineButton} onClick={() => setConfirming(false)}>
              გაუქმება
            </button>
            <form action={action}>
              <input type="hidden" name="id" value={medication.id} />
              <DeleteButton />
            </form>
          </div>
        </div>
      )}

      {!!state.error && <p className={styles.actionError}>{state.error}</p>}

      {editing && <MedicationForm medication={medication} onDone={() => setEditing(false)} />}
    </article>
  );
}
