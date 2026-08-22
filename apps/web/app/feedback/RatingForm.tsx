'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { submitFeedback, type FeedbackInfo } from './actions';
import styles from './feedback.module.css';

const LABELS = ['', 'ცუდად', 'ნაკლებად', 'საშუალოდ', 'კარგად', 'ძალიან კარგად'];

/**
 * ვარსკვლავები და კომენტარი.
 *
 * ხუთბალიანი შკალა განზრახ: მშობელი ტელეფონიდან ავსებს და გრძელ
 * კითხვარს არ დაასრულებდა.
 */
export function RatingForm({ token, initial }: { token: string; initial: FeedbackInfo }) {
  const [rating, setRating] = useState(initial.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial.comment ?? '');
  const [done, setDone] = useState(!!initial.ratedAt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = hover || rating;

  if (done) {
    return (
      <div className={styles.done}>
        <p className={styles.doneText}>გმადლობთ შეფასებისთვის!</p>
        <Link href="/account" className="btn btn-primary">
          კაბინეტში დაბრუნება
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.star} ${value <= shown ? styles.starOn : ''}`}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${value} ვარსკვლავი`}
          >
            ★
          </button>
        ))}
      </div>

      <p className={styles.ratingLabel}>{shown ? LABELS[shown] : 'აირჩიეთ შეფასება'}</p>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="რისი გაუმჯობესება შეგვიძლია? (არასავალდებულო)"
        className={styles.textarea}
        rows={4}
        maxLength={1000}
      />

      {!!error && <p className={styles.error}>{error}</p>}

      <button
        type="button"
        className="btn btn-primary"
        disabled={pending || rating === 0}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await submitFeedback(token, rating, comment);
            if (result.error) setError(result.error);
            else setDone(true);
          })
        }
      >
        {pending ? 'იგზავნება…' : 'შეფასების გაგზავნა'}
      </button>
    </div>
  );
}
