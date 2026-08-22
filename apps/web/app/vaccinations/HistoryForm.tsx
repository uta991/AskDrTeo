'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveHistory, type VaccinationRow } from './actions';
import styles from './vaccinations.module.css';

/**
 * აცრების ისტორიის შევსება.
 *
 * მხოლოდ ის აცრები ჩანს, რომლებიც ამ ასაკში უკვე უნდა ჰქონდეს —
 * მომავალი აცრების მონიშვნა მშობელს მხოლოდ დააბნევდა.
 */
export function HistoryForm({
  childId,
  childName,
  rows,
}: {
  childId: string;
  childName: string;
  rows: VaccinationRow[];
}) {
  const [done, setDone] = useState<Set<string>>(
    new Set(rows.filter((row) => row.doneAt).map((row) => row.vaccineId)),
  );
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (vaccineId: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(vaccineId)) next.delete(vaccineId);
      else next.add(vaccineId);
      return next;
    });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveHistory(childId, [...done]);
      if (result.error) setError(result.error);
      else setSaved(result.missing ?? 0);
    });
  };

  if (saved !== null) {
    return (
      <div className={styles.saved}>
        <h3 className={styles.savedTitle}>
          {saved === 0 ? 'ყველა აცრა გაკეთებულია' : `დაგრჩენიათ ${saved} აცრა`}
        </h3>

        <p className={styles.savedText}>
          {saved === 0
            ? `${childName}-ს ამ ასაკის ყველა აცრა აქვს გაკეთებული. მომდევნო აცრაზე სამი თვით ადრე შეგახსენებთ.`
            : 'დარჩენილი აცრების სია SMS-ითაც გამოგიგზავნეთ. ვიზიტი შეგიძლიათ ახლავე დაჯავშნოთ.'}
        </p>

        <div className={styles.savedActions}>
          <Link href="/booking" className="btn btn-primary">
            ვიზიტის დაჯავშნა
          </Link>
          <Link href="/vaccinations" className="btn btn-outline">
            კალენდარის ნახვა
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <p className={styles.progress}>
        მონიშნეთ, რომელი აცრები აქვს {childName}-ს უკვე გაკეთებული. სიაში მხოლოდ
        მისი ასაკის აცრებია.
      </p>

      {!rows.length && (
        <p className={styles.empty}>ამ ასაკში აცრა ჯერ არ არის საჭირო.</p>
      )}

      {rows.map((row) => (
        <button
          key={row.vaccineId}
          type="button"
          onClick={() => toggle(row.vaccineId)}
          className={`${styles.row} ${done.has(row.vaccineId) ? styles.rowDone : ''}`}
        >
          <span
            className={`${styles.check} ${done.has(row.vaccineId) ? styles.checkOn : ''}`}
            aria-hidden
          >
            {done.has(row.vaccineId) ? '✓' : ''}
          </span>

          <span className={styles.rowMain}>
            <span className={styles.rowName}>{row.name}</span>
            {!!row.description && <span className={styles.rowDesc}>{row.description}</span>}
          </span>

          <span className={styles.status}>{row.dueAt.slice(0, 10)}</span>
        </button>
      ))}

      {!!error && <p className={styles.error}>{error}</p>}

      {rows.length > 0 && (
        <button type="button" className="btn btn-primary" disabled={pending} onClick={submit}>
          {pending ? 'ინახება…' : 'შენახვა'}
        </button>
      )}
    </div>
  );
}
