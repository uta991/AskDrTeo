'use client';

import { useState, useTransition } from 'react';
import { decideAppointment, type AdminAppointment } from './actions';
import styles from '../admin.module.css';

const STATUS_LABELS: Record<AdminAppointment['status'], string> = {
  REQUESTED: 'განხილვაშია',
  CONFIRMED: 'დადასტურებული',
  DECLINED: 'უარყოფილი',
  CANCELED: 'გაუქმებული',
  DONE: 'შედგა',
};

/** ISO → input[type=datetime-local]-ის ფორმატი. */
function forInput(iso: string): string {
  return iso.slice(0, 16);
}

export function AppointmentRow({ appointment }: { appointment: AdminAppointment }) {
  const [scheduledAt, setScheduledAt] = useState(
    forInput(appointment.scheduledAt ?? appointment.preferredAt),
  );
  const [note, setNote] = useState(appointment.staffNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const decide = (decision: 'confirm' | 'decline' | 'done') => {
    setError(null);
    startTransition(async () => {
      const result = await decideAppointment(appointment.id, decision, scheduledAt, note);
      if (result.error) setError(result.error);
    });
  };

  const parentName = appointment.parent
    ? `${appointment.parent.firstName} ${appointment.parent.lastName ?? ''}`.trim()
    : 'მშობელი';

  const open = appointment.status === 'REQUESTED' || appointment.status === 'CONFIRMED';

  return (
    <article className={styles.newsCard}>
      <div className={styles.newsHead}>
        <strong>{parentName}</strong>
        <span
          className={appointment.status === 'CONFIRMED' ? styles.badgeActive : styles.badgeOff}
        >
          {STATUS_LABELS[appointment.status]}
        </span>
      </div>

      <div className={styles.promoMeta}>
        <span>სასურველი: {appointment.preferredAt.replace('T', ' ').slice(0, 16)}</span>
        {!!appointment.child && <span>ბავშვი: {appointment.child.firstName}</span>}
        {!!appointment.parent?.phone && <span>{appointment.parent.phone}</span>}
        {appointment.usedFreeVisit && <span>უფასო ვიზიტი</span>}
      </div>

      {!!appointment.reason && <p className={styles.newsBody}>{appointment.reason}</p>}

      {open && (
        <>
          <div className={styles.formRow}>
            <label className={styles.miniField}>
              <span className={styles.miniLabel}>დადასტურებული დრო</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className={styles.input}
              />
            </label>

            <label className={styles.miniField}>
              <span className={styles.miniLabel}>შენიშვნა მშობლისთვის</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={styles.input}
                maxLength={500}
              />
            </label>
          </div>

          {!!error && <p className={styles.actionError}>{error}</p>}

          <div className={styles.actionRow}>
            {appointment.status === 'REQUESTED' && (
              <>
                <button
                  className="btn btn-primary"
                  disabled={pending}
                  onClick={() => decide('confirm')}
                >
                  დადასტურება
                </button>

                <button
                  className={styles.purgeLink}
                  disabled={pending}
                  onClick={() => decide('decline')}
                >
                  უარი
                </button>
              </>
            )}

            {appointment.status === 'CONFIRMED' && (
              <button className="btn btn-outline" disabled={pending} onClick={() => decide('done')}>
                ვიზიტი შედგა
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
