'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bookFreeVisit, buyVisit, type VisitDay } from './actions';
import type { ChildSummary } from '@/lib/children';
import styles from './visit.module.css';

const WEEKDAYS = ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];
const MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

/**
 * დღის არჩევა.
 *
 * მშობელი მხოლოდ დღეს ირჩევს — ზუსტ საათს ექიმი ნიშნავს. თავისუფალი
 * ადგილები თითოეულ დღეზე მაშინვე ჩანს: გადახდის შემდეგ „ადგილი აღარ
 * არის" ყველაზე ცუდი პასუხია.
 */
export function VisitBooking({
  days,
  price,
  basePrice,
  coverPercent,
  freeCredits,
  childProfiles,
}: {
  days: VisitDay[];
  price: string;
  basePrice: string;
  /** რამდენ პროცენტს ფარავს მოქმედი უფლება */
  coverPercent: number;
  /** უფასო ვიზიტების ნაშთი — პრომო კოდიდან */
  freeCredits: number;
  childProfiles: ChildSummary[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(
    days.find((day) => day.free > 0)?.date ?? null,
  );
  const [childId, setChildId] = useState(childProfiles[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const book = () => {
    if (!selected) return;
    setError(null);

    startTransition(async () => {
      // უფასო უფლება ბანკს გვერდს უვლის — გადახდის გვერდზე გასვლა
      // უაზრო ნაბიჯი იქნებოდა
      if (freeCredits > 0) {
        const result = await bookFreeVisit(selected, childId, reason);

        if (result.ok) {
          router.refresh();
          return;
        }

        setError(result.error ?? 'ჯავშანი ვერ შეიქმნა');
        return;
      }

      const result = await buyVisit(selected, childId, reason);

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      setError(result.error ?? 'გადახდა ვერ დაიწყო');
    });
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>აირჩიეთ დღე</h2>
      <p className={styles.hint}>
        ზუსტ საათს ექიმი დანიშნავს და SMS-ით შეგატყობინებთ — ჩართვისთვის
        5 წუთით ადრე მზად იყავით.
      </p>

      {freeCredits > 0 ? (
        <p className={styles.freeNote}>
          თქვენ გაქვთ {freeCredits} უფასო ვიზიტი — ეს ჯავშანი გადახდას არ
          მოითხოვს.
        </p>
      ) : (
        coverPercent > 0 && (
          <p className={styles.discountNote}>
            წინა ვიზიტზე დაგვიანების გამო ამ ჯავშანზე ღირებულების მხოლოდ{' '}
            {100 - coverPercent}%-ს იხდით — <s>{basePrice}</s> <strong>{price}</strong>
          </p>
        )
      )}

      <div className={styles.days}>
        {days.map((day) => {
          const date = new Date(`${day.date}T00:00:00`);
          const full = day.free === 0;

          return (
            <button
              key={day.date}
              type="button"
              disabled={full}
              onClick={() => setSelected(day.date)}
              className={`${styles.day} ${selected === day.date ? styles.dayActive : ''} ${
                full ? styles.dayFull : ''
              }`}
            >
              <span className={styles.dayWeek}>{WEEKDAYS[date.getDay()]}</span>
              <span className={styles.dayNumber}>{date.getDate()}</span>
              <span className={styles.dayMonth}>{MONTHS[date.getMonth()].slice(0, 3)}</span>
              <span className={styles.dayFree}>
                {full ? 'სავსეა' : `${day.free} ადგილი`}
              </span>
            </button>
          );
        })}
      </div>

      {childProfiles.length > 0 && (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>ბავშვი</span>
          <select
            className={styles.input}
            value={childId}
            onChange={(event) => setChildId(event.target.value)}
          >
            {childProfiles.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} · {child.ageLabel}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>რა გაწუხებთ (ექიმი წინასწარ წაიკითხავს)</span>
        <textarea
          className={styles.input}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>

      {!!error && <p className={styles.error}>{error}</p>}

      <button
        type="button"
        className="btn btn-primary"
        disabled={!selected || busy}
        onClick={book}
      >
        {busy
          ? 'იგზავნება…'
          : freeCredits > 0
            ? 'დაჯავშნა — 0 ₾'
            : `დაჯავშნა — ${price}`}
      </button>
    </section>
  );
}
