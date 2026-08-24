'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { joinVisit, type MyVisit, type VisitStatus } from './actions';
import styles from './visit.module.css';

const STATUS_LABELS: Record<VisitStatus, string> = {
  REQUESTED: 'საათი ჯერ არ არის დანიშნული',
  SCHEDULED: 'დანიშნულია',
  LIVE: 'მიმდინარეობს',
  DONE: 'დასრულდა',
  CANCELED: 'გაუქმდა',
  NO_SHOW: 'არ შედგა',
};

function readable(value: string): string {
  return value.replace('T', ' ').slice(0, 16);
}

export function MyVisits({ visits }: { visits: MyVisit[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  const join = (id: string) => {
    setError(null);

    startTransition(async () => {
      const result = await joinVisit(id);

      if (result.data) {
        router.push(`/video-visit/${id}`);
        return;
      }

      setError(result.error ?? 'ჩართვა ვერ მოხერხდა');
    });
  };

  if (!visits.length) return null;

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>ჩემი ვიდეო ვიზიტები</h2>

      {!!error && <p className={styles.error}>{error}</p>}

      {visits.map((visit) => (
        <div key={visit.id} className={styles.visitRow}>
          <div className={styles.visitMain}>
            <strong className={styles.visitDate}>
              {visit.scheduledAt ? readable(visit.scheduledAt) : visit.date}
            </strong>
            <span className={styles.visitMeta}>
              {STATUS_LABELS[visit.status]}
              {visit.child ? ` · ${visit.child.firstName}` : ''}
            </span>
            {!!visit.staffNote && <span className={styles.visitNote}>{visit.staffNote}</span>}
          </div>

          {visit.canJoin ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => join(visit.id)}
            >
              ონლაინ ჩართვა
            </button>
          ) : (
            <span className={styles.visitWait}>
              {visit.status === 'REQUESTED' ? 'ელოდება საათს' : '—'}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}
