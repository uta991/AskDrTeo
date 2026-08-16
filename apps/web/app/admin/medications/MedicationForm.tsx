'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Medication } from '@/lib/medications';
import { saveMedication, type MedicationState } from './actions';
import styles from '../admin.module.css';

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'ინახება…' : editing ? 'შენახვა' : 'დამატება'}
    </button>
  );
}

function Field({
  name,
  label,
  hint,
  defaultValue,
  ...rest
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | number;
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric';
  required?: boolean;
}) {
  return (
    <label className={styles.miniField}>
      <span className={styles.miniLabel}>{label}</span>
      <input name={name} defaultValue={defaultValue} className={styles.input} {...rest} />
      {!!hint && <span className={styles.miniLabel}>{hint}</span>}
    </label>
  );
}

/**
 * წამლის ფორმა.
 *
 * კონცენტრაციები და ასაკობრივი საფეხურები ტექსტის ველშია, თითო
 * ხაზზე ერთი ჩანაწერი: ცვალებადი რაოდენობის ველების დინამიური
 * დამატება ფორმას გაცილებით რთულს გახდიდა, სარგებელი კი მცირეა.
 */
export function MedicationForm({
  medication,
  onDone,
}: {
  medication?: Medication;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState<MedicationState, FormData>(saveMedication, {});
  const [dosingType, setDosingType] = useState(medication?.dosingType ?? 'PER_KG');

  const concentrationsText = (medication?.concentrations ?? [])
    .map((c) => `${c.label} | ${c.mg} | ${c.ml}`)
    .join('\n');

  const bandsText = (medication?.ageBands ?? [])
    .map((b) => `${b.label} | ${b.untilMonths} | ${b.mg}`)
    .join('\n');

  return (
    <form action={formAction} className={styles.staffForm}>
      {!!medication && <input type="hidden" name="id" value={medication.id} />}

      <div className={styles.formRow}>
        <Field
          name="name"
          label="დასახელება"
          defaultValue={medication?.name}
          placeholder="პარაცეტამოლი"
          required
        />
        <Field
          name="slug"
          label="იდენტიფიკატორი"
          hint="ლათინურად, უნიკალური"
          defaultValue={medication?.slug}
          placeholder="paracetamol"
          required
        />
      </div>

      <div className={styles.typeRow}>
        <label className={dosingType === 'PER_KG' ? styles.typeActive : styles.typeOption}>
          <input
            type="radio"
            name="dosingType"
            value="PER_KG"
            checked={dosingType === 'PER_KG'}
            onChange={() => setDosingType('PER_KG')}
          />
          დოზა წონაზე (მგ/კგ)
        </label>

        <label className={dosingType === 'BY_AGE' ? styles.typeActive : styles.typeOption}>
          <input
            type="radio"
            name="dosingType"
            value="BY_AGE"
            checked={dosingType === 'BY_AGE'}
            onChange={() => setDosingType('BY_AGE')}
          />
          დოზა ასაკზე
        </label>
      </div>

      {dosingType === 'PER_KG' ? (
        <div className={styles.formRow}>
          <Field
            name="mgPerKgMin"
            label="მგ / კგ — მინიმუმი"
            defaultValue={medication?.mgPerKgMin ?? ''}
            placeholder="10"
            inputMode="decimal"
          />
          <Field
            name="mgPerKgMax"
            label="მგ / კგ — მაქსიმუმი"
            hint="თუ დიაპაზონი არაა, იგივე რიცხვი"
            defaultValue={medication?.mgPerKgMax ?? ''}
            placeholder="15"
            inputMode="decimal"
          />
        </div>
      ) : (
        <label className={styles.miniField}>
          <span className={styles.miniLabel}>ასაკობრივი საფეხურები</span>
          <textarea
            name="ageBands"
            defaultValue={bandsText}
            className={styles.textarea}
            rows={4}
            placeholder={'6 თვიდან 2 წლამდე | 24 | 2.5\n2-დან 6 წლამდე | 72 | 6'}
          />
          <span className={styles.miniLabel}>
            თითო ხაზზე: აღწერა | რომელ თვემდე | დოზა მგ-ში
          </span>
        </label>
      )}

      <div className={styles.formRow}>
        <Field
          name="intervalHoursMin"
          label="ინტერვალი — საათი (მინ.)"
          defaultValue={medication?.intervalHoursMin ?? ''}
          placeholder="4"
          inputMode="numeric"
          required
        />
        <Field
          name="intervalHoursMax"
          label="ინტერვალი — საათი (მაქს.)"
          defaultValue={medication?.intervalHoursMax ?? ''}
          placeholder="6"
          inputMode="numeric"
          required
        />
        <Field
          name="maxDailyMg"
          label="მაქს. დოზა დღეში (მგ)"
          defaultValue={medication?.maxDailyMg ?? ''}
          placeholder="2000"
          inputMode="decimal"
          required
        />
      </div>

      <div className={styles.formRow}>
        <Field
          name="minAgeMonths"
          label="მინ. ასაკი (თვე)"
          hint="ამ ასაკამდე არ ითვლება"
          defaultValue={medication?.minAgeMonths ?? 0}
          inputMode="numeric"
        />
        <Field
          name="minWeightKg"
          label="მინ. წონა (კგ)"
          hint="ამ წონაზე ნაკლებზე არ ითვლება"
          defaultValue={medication?.minWeightKg ?? 0}
          inputMode="decimal"
        />
        <Field
          name="sortOrder"
          label="რიგითობა"
          defaultValue={medication?.sortOrder ?? 0}
          inputMode="numeric"
        />
      </div>

      <label className={styles.miniField}>
        <span className={styles.miniLabel}>კონცენტრაციები</span>
        <textarea
          name="concentrations"
          defaultValue={concentrationsText}
          className={styles.textarea}
          rows={4}
          placeholder={'სიროფი 120 მგ / 5 მლ | 120 | 5\nწვეთები 100 მგ / 1 მლ | 100 | 1'}
          required
        />
        <span className={styles.miniLabel}>
          თითო ხაზზე: აღწერა | მგ | მლ — მილილიტრი სწორედ ამაზე ითვლება
        </span>
      </label>

      <label className={styles.miniField}>
        <span className={styles.miniLabel}>შენიშვნა მშობლისთვის</span>
        <input
          name="note"
          defaultValue={medication?.note ?? ''}
          className={styles.input}
          placeholder="6 თვემდე არ გამოიყენება."
        />
      </label>

      {!!state.error && <p className={styles.actionError}>{state.error}</p>}
      {!!state.notice && <p className={styles.actionNotice}>{state.notice}</p>}

      <div className={styles.confirmRow}>
        {!!onDone && (
          <button type="button" className={styles.outlineButton} onClick={onDone}>
            გაუქმება
          </button>
        )}
        <Submit editing={!!medication} />
      </div>
    </form>
  );
}
