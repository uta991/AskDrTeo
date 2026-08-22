import Link from 'next/link';
import styles from '../admin.module.css';

export interface Feedback {
  count: number;
  average: number | null;
  /** ოპერატორების ჭრილი — ვის რა საშუალო აქვს */
  operators: { id: string; name: string; count: number; average: number }[];
  items: {
    rating: number | null;
    comment: string | null;
    ratedAt: string | null;
    operator: { id: string; firstName: string; lastName: string | null } | null;
    /** ერთ საუბარს რამდენიმე ოპერატორი პასუხობს */
    operators: { id: string; name: string; messageCount: number }[];
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
export function FeedbackSummary({
  feedback,
  basePath = '/admin/chat',
  selectedOperator,
}: {
  feedback: Feedback | null;
  basePath?: string;
  /** მონიშნული ოპერატორი — მისი შეფასებები ცალკე იფილტრება */
  selectedOperator?: string;
}) {
  if (!feedback?.count && !selectedOperator) {
    return <p className={styles.empty}>შეფასება ჯერ არავის დაუტოვებია.</p>;
  }

  return (
    <div className={styles.userList}>
      <p className={styles.hint}>
        საშუალო შეფასება: <strong>{feedback?.average ?? '—'}</strong> / 5 (
        {feedback?.count ?? 0} შეფასება)
      </p>

      {/* ოპერატორის მონიშვნა — ვის რა შეფასება აქვს */}
      {!!feedback?.operators.length && (
        <div className={styles.filterRow}>
          <Link
            href={basePath}
            className={!selectedOperator ? styles.filterChipActive : styles.filterChip}
          >
            ყველა
          </Link>

          {feedback.operators.map((operator) => (
            <Link
              key={operator.id}
              href={`${basePath}?operator=${operator.id}`}
              className={
                selectedOperator === operator.id ? styles.filterChipActive : styles.filterChip
              }
            >
              {operator.name} · {operator.average} ({operator.count})
            </Link>
          ))}
        </div>
      )}

      {!feedback?.count && (
        <p className={styles.empty}>ამ ოპერატორს შეფასება ჯერ არ აქვს.</p>
      )}

      {(feedback?.items ?? []).slice(0, 20).map((item, index) => (
        <article key={index} className={styles.newsCard}>
          <div className={styles.newsHead}>
            <strong>
              {item.operators.length
                ? item.operators.map((operator) => operator.name).join(', ')
                : item.operator
                  ? `${item.operator.firstName} ${item.operator.lastName ?? ''}`.trim()
                  : 'კონსულტანტი'}
            </strong>
            <span className={styles.badgeOff}>{stars(item.rating)}</span>
          </div>

          {!!item.comment && <p className={styles.newsBody}>{item.comment}</p>}

          <div className={styles.promoMeta}>
            {!!item.ratedAt && <span>{item.ratedAt.slice(0, 10)}</span>}
            {item.operators.length > 1 && (
              <span>
                პასუხობდა {item.operators.length} ოპერატორი:{' '}
                {item.operators.map((o) => `${o.name} (${o.messageCount})`).join(', ')}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
