import Link from 'next/link';
import type { ConversationRow } from './actions';
import styles from './chat.module.css';

const STATUS_LABELS: Record<ConversationRow['status'], string> = {
  OPEN: 'პასუხის მოლოდინში',
  ASSIGNED: 'მიმდინარე',
  RESOLVED: 'დასრულებული',
  CLOSED: 'დახურული',
};

/**
 * წინა საუბრები.
 *
 * ერთი მუდმივად გახსნილი ჩატის ნაცვლად — თარიღიანი ისტორია: მშობელს
 * უნდა შეეძლოს ნახოს, როდის და ვისთან რაზე ისაუბრა.
 */
export function ChatHistory({
  conversations,
  activeId,
}: {
  conversations: ConversationRow[];
  activeId: string | null;
}) {
  const history = conversations.filter((row) => row.id !== activeId);
  if (!history.length) return null;

  return (
    <div className={styles.history}>
      <h3 className={styles.historyTitle}>წინა საუბრები</h3>

      {history.map((row) => (
        <Link key={row.id} href={`/chat?id=${row.id}`} className={styles.historyRow}>
          <span className={styles.historyMain}>
            <span className={styles.historyDate}>
              {(row.closedAt ?? row.lastMessageAt ?? row.createdAt).slice(0, 10)}
            </span>
            <span className={styles.historyPreview}>{row.lastMessage ?? row.subject}</span>
          </span>

          <span className={styles.historyMeta}>
            {row.operators.length ? row.operators.join(', ') : STATUS_LABELS[row.status]}
          </span>
        </Link>
      ))}
    </div>
  );
}
