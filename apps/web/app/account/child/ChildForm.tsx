'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createChild, type ChildFormState } from './actions';
import styles from './child.module.css';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'ინახება…' : 'პროფილის შენახვა'}
    </button>
  );
}

function Field({
  name,
  label,
  type = 'text',
  placeholder,
  error,
  hint,
  ...rest
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  step?: string;
  min?: number;
  max?: number;
  required?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className={styles.input}
        {...rest}
      />
      {!!hint && <span className={styles.hint}>{hint}</span>}
      {!!error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
}

/**
 * ბავშვის პროფილი — აპლიკაციის იგივე ველები.
 *
 * ფოტო სავალდებულოა: ასაკობრივი რჩევები და ჩატი მასზეა მიბმული და
 * უფოტოო ჩანაწერი ნახევრად შევსებულ პროფილს ტოვებდა.
 */
export function ChildForm() {
  const [state, formAction] = useActionState<ChildFormState, FormData>(createChild, {});
  const [preview, setPreview] = useState<string | null>(null);
  const errors = state.fieldErrors ?? {};

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className={styles.form}>
      {/* ── ფოტო ─────────────────────────────────────────────── */}
      <label className={styles.photoPicker}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="არჩეული ფოტო" className={styles.photoPreview} />
        ) : (
          <span className={styles.photoPlaceholder}>+</span>
        )}

        <input
          name="photo"
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
          required
        />
        <span className={styles.photoLabel}>ბავშვის ფოტო</span>
      </label>
      {!!errors.photo && <p className={styles.fieldError}>{errors.photo}</p>}

      {/* ── ბავშვი ───────────────────────────────────────────── */}
      <div className={styles.row}>
        <Field name="firstName" label="სახელი" error={errors.firstName} required />
        <Field name="lastName" label="გვარი" />
      </div>

      <label className={styles.field}>
        <span className={styles.label}>სქესი</span>
        <select name="gender" className={styles.input} defaultValue="">
          <option value="">არ არის მითითებული</option>
          <option value="MALE">ბიჭი</option>
          <option value="FEMALE">გოგო</option>
        </select>
      </label>

      <Field
        name="birthDate"
        label="დაბადების თარიღი"
        type="date"
        max={today as unknown as number}
        error={errors.birthDate}
        required
      />

      <Field
        name="gestationalWeek"
        label="დაბადების კვირა"
        type="number"
        min={22}
        max={45}
        placeholder="მაგ. 38"
        hint="ორსულობის კვირა დაბადებისას — ნაადრევად დაბადებულთა ასაკი კორექტირდება"
      />

      <div className={styles.row}>
        <Field
          name="birthWeight"
          label="წონა (კგ)"
          type="number"
          step="0.01"
          placeholder="მაგ. 3.2"
        />
        <Field
          name="birthHeight"
          label="სიგრძე (სმ)"
          type="number"
          step="0.1"
          placeholder="მაგ. 50"
        />
      </div>

      {/* ── მშობლები ─────────────────────────────────────────── */}
      <h3 className={styles.sectionTitle}>დედა</h3>
      <div className={styles.row}>
        <Field name="motherFirstName" label="სახელი" />
        <Field name="motherLastName" label="გვარი" />
      </div>
      <Field name="motherBirthDate" label="დაბადების თარიღი" type="date" />

      <h3 className={styles.sectionTitle}>მამა</h3>
      <div className={styles.row}>
        <Field name="fatherFirstName" label="სახელი" />
        <Field name="fatherLastName" label="გვარი" />
      </div>
      <Field name="fatherBirthDate" label="დაბადების თარიღი" type="date" />

      {!!state.error && <p className={styles.error}>{state.error}</p>}

      <Submit />
    </form>
  );
}
