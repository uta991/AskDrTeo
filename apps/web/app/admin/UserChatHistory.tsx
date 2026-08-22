'use client';

import { useEffect, useState } from 'react';
import { loadUserChats, type UserConversation } from './actions';
import styles from './admin.module.css';

const STATUS_LABELS: Record<UserConversation['status'], string> = {
  OPEN: 'პასუხის მოლოდინში',
  ASSIGNED: 'მიმდინარე',
  RESOLVED: 'დასრულებული',
  CLOSED: 'დახურული',
};

/** ვარსკვლავები ტექსტად. */
function stars(rating: number | null): string {
  if (!rating) return '';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

/**
 * მომხმარებლის ჩატის ისტორია ბარათში.
 *
 * ბარათის გახსნისას იტვირთება და არა სიის აწყობისას — 50 მშობელზე
 * 50 ზედმეტი მოთხოვნა გვერდს შეანელებდა.
 */
export function UserChatHistory({ userId }: { userId: string }) {
  const [rows, setRows] = useState<UserConversation[] | null>(null);

  useEffect(() => {
    void loadUserChats(userId).then(setRows);
  }, [userId]);

  if (!rows) return <p className={styles.hint}>ჩატის ისტორია იტვირთება…</p>;
  if (!rows.length) return <p className={styles.hint}>ჩატში არასდროს მოუწერია.</p>;

  return (
    <div className={styles.chatHistory}>
      {rows.map((row) => (
        <div key={row.id} className={styles.chatHistoryRow}>
          <div className={styles.chatHistoryHead}>
            <strong>{row.createdAt.slice(0, 10)}</strong>
            <span className={styles.chatHistoryStatus}>
              {STATUS_LABELS[row.status]}
              {!!row.rating && ` · ${stars(row.rating)}`}
            </span>
          </div>

          {!!row.firstMessage && <p className={styles.chatHistoryText}>{row.firstMessage}</p>}

          <div className={styles.promoMeta}>
            <span>{row.messageCount} შეტყობინება</span>
            <span>
              {row.operators.length ? `უპასუხა: ${row.operators.join(', ')}` : 'პასუხის გარეშე'}
            </span>
            {!!row.comment && <span>„{row.comment}"</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
