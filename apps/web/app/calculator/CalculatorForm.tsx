'use client';

import { useMemo, useState } from 'react';
import { calculateDose, type Medication } from '@/lib/medications';
import styles from './calculator.module.css';

/** წლები და თვეები ერთ რიცხვში — ცნობარი თვეებში ითვლის. */
function toMonths(years: string, months: string): number {
  return (Number(years) || 0) * 12 + (Number(months) || 0);
}

export function CalculatorForm({ medications }: { medications: Medication[] }) {
  const [medKey, setMedKey] = useState(medications[0]?.slug ?? '');
  const [weight, setWeight] = useState('');
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [concIndex, setConcIndex] = useState(0);

  const medication = medications.find((m) => m.slug === medKey) ?? medications[0];

  const result = useMemo(() => {
    if (!medication) return null;

    const kg = Number(weight.replace(',', '.'));
    if (!kg || kg <= 0) return null;

    return calculateDose(
      medication,
      kg,
      toMonths(years, months),
      medication.concentrations[concIndex],
    );
  }, [medication, weight, years, months, concIndex]);

  const blocked = result && 'blocked' in result ? result.blocked : null;
  const dose = result && !('blocked' in result) ? result : null;

  const range = (min: number, max: number, unit: string) =>
    min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;

  if (!medication) {
    return <p className={styles.placeholder}>ცნობარი ჯერ ცარიელია.</p>;
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <label className={styles.field}>
          <span className={styles.label}>წამალი</span>
          <select
            value={medKey}
            onChange={(event) => {
              setMedKey(event.target.value);
              setConcIndex(0);
            }}
            className={styles.input}
          >
            {medications.map((med) => (
              <option key={med.slug} value={med.slug}>
                {med.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>ბავშვის წონა (კგ)</span>
          <input
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            inputMode="decimal"
            placeholder="მაგ. 12.5"
            className={styles.input}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>ასაკი — წელი</span>
            <input
              value={years}
              onChange={(event) => setYears(event.target.value)}
              inputMode="numeric"
              placeholder="0"
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>თვე</span>
            <input
              value={months}
              onChange={(event) => setMonths(event.target.value)}
              inputMode="numeric"
              placeholder="0"
              className={styles.input}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>პრეპარატის კონცენტრაცია</span>
          <select
            value={concIndex}
            onChange={(event) => setConcIndex(Number(event.target.value))}
            className={styles.input}
          >
            {medication.concentrations.map((c, index) => (
              <option key={c.label} value={index}>
                {c.label}
              </option>
            ))}
          </select>
          <span className={styles.hint}>
            შეამოწმეთ შეფუთვაზე — მილილიტრი სწორედ ამაზეა დამოკიდებული.
          </span>
        </label>
      </form>

      <section className={styles.result}>
        {!result && <p className={styles.placeholder}>შეიყვანეთ წონა და ასაკი</p>}

        {!!blocked && <p className={styles.blocked}>{blocked}</p>}

        {!!dose && (
          <>
            <div className={styles.doseBlock}>
              <div className={styles.doseLabel}>ერთჯერადი დოზა</div>
              <div className={styles.doseMl}>
                {range(dose.singleMlMin ?? 0, dose.singleMlMax ?? 0, 'მლ')}
              </div>
              <div className={styles.doseMg}>
                {range(dose.singleMgMin, dose.singleMgMax, 'მგ')}
              </div>
            </div>

            <dl className={styles.facts}>
              <div>
                <dt>მიღების ინტერვალი</dt>
                <dd>
                  {medication.intervalHoursMin === medication.intervalHoursMax
                    ? `${medication.intervalHoursMin} საათში ერთხელ`
                    : `${medication.intervalHoursMin}–${medication.intervalHoursMax} საათში ერთხელ`}
                </dd>
              </div>
              <div>
                <dt>დღეში მაქსიმუმ</dt>
                <dd>
                  {dose.dosesPerDay} მიღება · {dose.dailyMaxMg} მგ
                </dd>
              </div>
              {!!dose.bandLabel && (
                <div>
                  <dt>ასაკობრივი საფეხური</dt>
                  <dd>{dose.bandLabel}</dd>
                </div>
              )}
            </dl>

            {dose.warnings.map((warning) => (
              <p key={warning} className={styles.warning}>
                {warning}
              </p>
            ))}
          </>
        )}

        {!!medication.note && <p className={styles.note}>{medication.note}</p>}

        <p className={styles.disclaimer}>
          გამოთვლა საორიენტაციოა და ექიმის დანიშნულებას არ ცვლის. ზუსტი დოზა
          დიაგნოზზე, თანმხლებ დაავადებებსა და სხვა მედიკამენტებზეა დამოკიდებული.
        </p>
      </section>
    </div>
  );
}
