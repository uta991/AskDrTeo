'use client';

import { useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  cancelVisit,
  requestVisit,
  type Appointment,
  type BookingState,
  type Quota,
} from './actions';
import type { ChildSummary } from '@/lib/children';
import styles from './booking.module.css';

const STATUS_LABELS: Record<Appointment['status'], string> = {
  REQUESTED: 'განხილვაშია',
  CONFIRMED: 'დადასტურებულია',
  DECLINED: 'უარყოფილია',
  CANCELED: 'გაუქმებულია',
  DONE: 'შედგა',
};

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'იგზავნება…' : 'ვიზიტის მოთხოვნა'}
    </button>
  );
}

export function BookingForm({
  childProfiles,
  appointments,
  quota,
}: {
  childProfiles: ChildSummary[];
  appointments: Appointment[];
  quota: Quota;
}) {
  const [state, formAction] = useActionState<BookingState, FormData>(requestVisit, {});
  const [, startTransition] = useTransition();

  const pendingRequest = appointments.some((item) => item.status === 'REQUESTED');

  return (
    <div className={styles.board}>
      <div className={quota.remaining > 0 ? styles.quotaFree : styles.quota}>
        {quota.limit > 0 ? (
          <>
            <strong>უფასო ვიზიტი ამ თვეში: {quota.remaining} / {quota.limit}</strong>
            <span className={styles.quotaMeta}>
              {quota.remaining > 0
                ? 'შემდეგი მოთხოვნა პაკეტის უფასო ვიზიტით გაიგზავნება.'
                : 'თვის კვოტა ამოწურულია — ვიზიტი ჩვეულებრივი წესით ანაზღაურდება.'}
            </span>
          </>
        ) : (
          <>
            <strong>უფასო ვიზიტი პრემიუმ პაკეტშია</strong>
            <span className={styles.quotaMeta}>
              თვეში ერთი ვიზიტი პედიატრ თეონა ტაბატაძესთან —{' '}
              <a href="/plans" className={styles.link}>
                პაკეტების ნახვა
              </a>
            </span>
          </>
        )}
      </div>

      {pendingRequest ? (
        <p className={styles.pendingNote}>
          თქვენი მოთხოვნა განხილვაშია — პასუხის შემდეგ ახლის გაგზავნა შესაძლებელი იქნება.
        </p>
      ) : (
        <form action={formAction} className={styles.form}>
          <div className={styles.formRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>თარიღი</span>
              <input
                type="date"
                name="date"
                min={tomorrow()}
                defaultValue={tomorrow()}
                className={styles.input}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>დრო</span>
              <input type="time" name="time" defaultValue="10:00" className={styles.input} required />
            </label>

            {childProfiles.length > 0 && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>ბავშვი</span>
                <select name="childId" className={styles.input}>
                  {childProfiles.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} · {child.ageLabel}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>რა გაწუხებთ (არასავალდებულო)</span>
            <textarea name="reason" rows={3} className={styles.input} maxLength={500} />
          </label>

          {!!state.error && <p className={styles.error}>{state.error}</p>}
          {!!state.notice && <p className={styles.notice}>{state.notice}</p>}

          <Submit />
        </form>
      )}

      {appointments.length > 0 && (
        <div className={styles.history}>
          <h3 className={styles.historyTitle}>ჩემი ჯავშნები</h3>

          {appointments.map((item) => (
            <div key={item.id} className={styles.historyRow}>
              <div className={styles.historyMain}>
                <span className={styles.historyDate}>
                  {(item.scheduledAt ?? item.preferredAt).replace('T', ' ').slice(0, 16)}
                </span>
                {!!item.child && <span className={styles.historyChild}>{item.child.firstName}</span>}
                {item.usedFreeVisit && <span className={styles.freeTag}>უფასო</span>}
                {!!item.staffNote && <span className={styles.staffNote}>{item.staffNote}</span>}
              </div>

              <span
                className={`${styles.status} ${
                  item.status === 'CONFIRMED'
                    ? styles.statusOk
                    : item.status === 'DECLINED'
                      ? styles.statusBad
                      : ''
                }`}
              >
                {STATUS_LABELS[item.status]}
              </span>

              {(item.status === 'REQUESTED' || item.status === 'CONFIRMED') && (
                <button
                  type="button"
                  className={styles.cancelLink}
                  onClick={() => startTransition(() => void cancelVisit(item.id))}
                >
                  გაუქმება
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
