'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { joinVisit, visitPresence, type MyVisit, type VisitStatus } from './actions';
import { formatTbilisi } from '@/lib/time';
import styles from './visit.module.css';

const STATUS_LABELS: Record<VisitStatus, string> = {
  REQUESTED: 'საათი ჯერ არ არის დანიშნული',
  SCHEDULED: 'დანიშნულია',
  LIVE: 'მიმდინარეობს',
  DONE: 'დასრულდა',
  CANCELED: 'გაუქმდა',
  NO_SHOW: 'არ შედგა',
};

/** ექიმის ჩართვა მშობელმა ჩართვამდე უნდა დაინახოს. */
const POLL_MS = 8000;

export function MyVisits({ visits }: { visits: MyVisit[] }) {
  const [doctorIn, setDoctorIn] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  // მხოლოდ ის ვიზიტები, სადაც ჩართვა უკვე შესაძლებელია
  const joinable = visits.filter((visit) => visit.canJoin).map((visit) => visit.id);
  const key = joinable.join(',');

  useEffect(() => {
    if (!key) return;

    const tick = async () => {
      const results = await Promise.all(
        key.split(',').map(async (id) => {
          const presence = await visitPresence(id, false).catch(() => null);
          return [id, !!presence?.staffPresent] as const;
        }),
      );

      setDoctorIn(Object.fromEntries(results));
    };

    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => clearInterval(timer);
  }, [key]);

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
      <h2 className={styles.cardTitle}>ჩემი ვიზიტები</h2>

      {!!error && <p className={styles.error}>{error}</p>}

      {visits.map((visit) => (
        <div key={visit.id} className={styles.visitRow}>
          <div className={styles.visitMain}>
            <strong className={styles.visitDate}>
              {visit.scheduledAt ? formatTbilisi(visit.scheduledAt) : visit.date}
            </strong>
            <span className={styles.visitMeta}>
              {STATUS_LABELS[visit.status]}
              {visit.child ? ` · ${visit.child.firstName}` : ''}
            </span>

            {doctorIn[visit.id] && (
              <span className={styles.doctorIn}>
                <span className={styles.doctorDot} />
                ექიმი კავშირზეა
              </span>
            )}
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
