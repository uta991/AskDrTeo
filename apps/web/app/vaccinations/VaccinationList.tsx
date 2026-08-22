'use client';

import { useState, useTransition } from 'react';
import { markVaccination, type VaccinationRow } from './actions';
import type { ChildSummary } from '@/lib/children';
import styles from './vaccinations.module.css';

const STATUS_LABELS: Record<VaccinationRow['status'], string> = {
  DONE: 'გაკეთებულია',
  DUE: 'ვადა გავიდა',
  SOON: 'უახლოეს დღეებში',
  UPCOMING: 'მომავალში',
};

/** ასაკი წარწერად — 18 თვე „1 წელი 6 თვედ" უფრო იკითხება. */
function ageLabel(months: number): string {
  if (months === 0) return 'დაბადებისთანავე';
  if (months < 12) return `${months} თვე`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} წელი` : `${years} წელი ${rest} თვე`;
}

export function VaccinationList({
  children,
  activeChildId,
  rows,
}: {
  children: ChildSummary[];
  activeChildId: string;
  rows: VaccinationRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (row: VaccinationRow) => {
    setError(null);
    startTransition(async () => {
      // ხელახლა დაჭერა მონიშვნას ხსნის — შეცდომით მონიშვნა ხშირია
      const result = await markVaccination(
        activeChildId,
        row.vaccineId,
        row.doneAt ? null : new Date().toISOString().slice(0, 10),
      );
      if (result.error) setError(result.error);
    });
  };

  // ასაკობრივი ბლოკები — კალენდარი ვიზიტებად იკითხება, არა სიად
  const groups = rows.reduce<Record<number, VaccinationRow[]>>((acc, row) => {
    (acc[row.ageMonths] ??= []).push(row);
    return acc;
  }, {});

  const done = rows.filter((row) => row.status === 'DONE').length;

  return (
    <div className={styles.list}>
      {children.length > 1 && (
        <div className={styles.childRow}>
          {children.map((child) => (
            <a
              key={child.id}
              href={`/vaccinations?child=${child.id}`}
              className={`${styles.childChip} ${
                child.id === activeChildId ? styles.childChipActive : ''
              }`}
            >
              {child.firstName} · {child.ageLabel}
            </a>
          ))}
        </div>
      )}

      <p className={styles.progress}>
        გაკეთებულია {done} / {rows.length}
      </p>

      {!!error && <p className={styles.error}>{error}</p>}

      {Object.entries(groups).map(([months, items]) => (
        <section key={months} className={styles.group}>
          <h3 className={styles.groupTitle}>{ageLabel(Number(months))}</h3>

          {items.map((row) => (
            <button
              key={row.vaccineId}
              type="button"
              disabled={pending}
              onClick={() => toggle(row)}
              className={`${styles.row} ${row.doneAt ? styles.rowDone : ''}`}
            >
              <span
                className={`${styles.check} ${row.doneAt ? styles.checkOn : ''}`}
                aria-hidden
              >
                {row.doneAt ? '✓' : ''}
              </span>

              <span className={styles.rowMain}>
                <span className={styles.rowName}>{row.name}</span>
                {!!row.description && (
                  <span className={styles.rowDesc}>{row.description}</span>
                )}
              </span>

              <span
                className={`${styles.status} ${
                  row.status === 'DONE'
                    ? styles.statusDone
                    : row.status === 'DUE'
                      ? styles.statusDue
                      : row.status === 'SOON'
                        ? styles.statusSoon
                        : ''
                }`}
              >
                {row.doneAt
                  ? `${STATUS_LABELS.DONE} · ${row.doneAt.slice(0, 10)}`
                  : `${STATUS_LABELS[row.status]} · ${row.dueAt.slice(0, 10)}`}
              </span>
            </button>
          ))}
        </section>
      ))}

      <p className={styles.note}>
        კალენდარი ცნობარია და არა დანიშნულება — ზუსტ დროსა და აცრის
        შესაძლებლობას პედიატრი განსაზღვრავს.
      </p>
    </div>
  );
}
