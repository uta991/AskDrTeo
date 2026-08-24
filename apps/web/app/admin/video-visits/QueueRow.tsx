'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { finishVisit, joinAsStaff, scheduleVisit, type QueueVisit } from './actions';
import styles from './queue.module.css';

const STATUS_LABELS: Record<QueueVisit['status'], string> = {
  REQUESTED: 'საათი დასანიშნია',
  SCHEDULED: 'დანიშნულია',
  LIVE: 'მიმდინარეობს',
  DONE: 'დასრულდა',
  CANCELED: 'გაუქმდა',
  NO_SHOW: 'არ შედგა',
};

function age(birthDate: string): string {
  const born = new Date(birthDate);
  const months =
    (new Date().getFullYear() - born.getFullYear()) * 12 +
    (new Date().getMonth() - born.getMonth());

  if (months < 12) return `${months} თვის`;
  return `${Math.floor(months / 12)} წლის ${months % 12 ? `${months % 12} თვის` : ''}`.trim();
}

/**
 * რიგის ერთი სტრიქონი.
 *
 * ექიმი აქ ხედავს, ვინ არის ჩაწერილი და რა აწუხებთ — ჩართვამდე
 * პროფილს ხსნის და ტექსტს კითხულობს.
 */
export function QueueRow({ visit, canConduct }: { visit: QueueVisit; canConduct: boolean }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(visit.scheduledAt?.slice(11, 16) ?? '10:00');
  const [note, setNote] = useState(visit.staffNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  const save = (date: string) => {
    setError(null);

    startTransition(async () => {
      const result = await scheduleVisit(visit.id, `${date}T${time}:00`, note);
      if (result.error) setError(result.error);
    });
  };

  const join = () => {
    setError(null);

    startTransition(async () => {
      const result = await joinAsStaff(visit.id);
      if (result.data) router.push(`/admin/video-visits/${visit.id}`);
      else setError(result.error ?? 'ჩართვა ვერ მოხერხდა');
    });
  };

  return (
    <article className={`${styles.row} ${visit.parentWaiting ? styles.rowWaiting : ''}`}>
      <div className={styles.rowMain}>
        <div className={styles.rowHead}>
          <strong className={styles.rowTime}>
            {visit.scheduledAt ? visit.scheduledAt.slice(11, 16) : '—:—'}
          </strong>
          <span className={styles.rowName}>
            {visit.parent.firstName} {visit.parent.lastName}
          </span>
          <span className={styles.rowStatus}>{STATUS_LABELS[visit.status]}</span>
          {visit.parentWaiting && <span className={styles.waiting}>მშობელი ოთახშია</span>}
        </div>

        <button type="button" className={styles.toggle} onClick={() => setOpen(!open)}>
          {open ? 'დახურვა' : 'პროფილი და მიზეზი'}
        </button>

        {open && (
          <div className={styles.details}>
            <div className={styles.detailGrid}>
              <span>ტელეფონი</span>
              <strong>{visit.parent.phone ?? '—'}</strong>

              <span>ელ. ფოსტა</span>
              <strong>{visit.parent.email ?? '—'}</strong>

              <span>ბავშვი</span>
              <strong>
                {visit.child
                  ? `${visit.child.firstName} · ${age(visit.child.birthDate)}`
                  : 'მითითებული არ არის'}
              </strong>
            </div>

            <p className={styles.reason}>
              {visit.reason || 'მშობელს მიზეზი არ მიუთითებია.'}
            </p>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>ვიზიტის საათი</span>
              <div className={styles.timeRow}>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className={styles.input}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => save(visit.scheduledAt?.slice(0, 10) ?? todayFor(visit))}
                >
                  {busy ? 'იგზავნება…' : 'დანიშვნა და SMS'}
                </button>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>შენიშვნა მშობლისთვის</span>
              <input
                className={styles.input}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
              />
            </label>
          </div>
        )}

        {!!error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.rowActions}>
        {canConduct && visit.status !== 'DONE' && visit.status !== 'CANCELED' && (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={join}>
            ონლაინ ჩართვა
          </button>
        )}

        {visit.status === 'LIVE' && (
          <button
            type="button"
            className={styles.finish}
            disabled={busy}
            onClick={() => startTransition(async () => void (await finishVisit(visit.id)))}
          >
            დასრულება
          </button>
        )}
      </div>
    </article>
  );
}

/** დღე რიგიდან — ჯავშანი ყოველთვის კონკრეტულ დღეზეა. */
function todayFor(visit: QueueVisit): string {
  return visit.scheduledAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
}
