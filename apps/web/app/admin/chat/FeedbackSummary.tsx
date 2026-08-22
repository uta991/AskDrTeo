import styles from '../admin.module.css';

export interface Feedback {
  count: number;
  average: number | null;
  items: {
    rating: number | null;
    comment: string | null;
    ratedAt: string | null;
    operator: { id: string; firstName: string; lastName: string | null } | null;
  }[];
}

/** ვარსკვლავები ტექსტად — ცხრილში ციფრზე უკეთ იკითხება. */
function stars(rating: number | null): string {
  if (!rating) return '—';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

/**
 * შეფასებების შეჯამება.
 *
 * საშუალო და ბოლო კომენტარები — ოპერატორთან საუბრის ხარისხი
 * სხვაგვარად უხილავი რჩებოდა.
 */
export function FeedbackSummary({ feedback }: { feedback: Feedback | null }) {
  if (!feedback?.count) {
    return <p className={styles.empty}>შეფასება ჯერ არავის დაუტოვებია.</p>;
  }

  return (
    <div className={styles.userList}>
      <p className={styles.hint}>
        საშუალო შეფასება: <strong>{feedback.average}</strong> / 5 ({feedback.count} შეფასება)
      </p>

      {feedback.items.slice(0, 20).map((item, index) => (
        <article key={index} className={styles.newsCard}>
          <div className={styles.newsHead}>
            <strong>
              {item.operator
                ? `${item.operator.firstName} ${item.operator.lastName ?? ''}`.trim()
                : 'კონსულტანტი'}
            </strong>
            <span className={styles.badgeOff}>{stars(item.rating)}</span>
          </div>

          {!!item.comment && <p className={styles.newsBody}>{item.comment}</p>}

          {!!item.ratedAt && (
            <div className={styles.promoMeta}>
              <span>{item.ratedAt.slice(0, 10)}</span>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
