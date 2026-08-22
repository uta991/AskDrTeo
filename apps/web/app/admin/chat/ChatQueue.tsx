'use client';

import { useState, useTransition } from 'react';
import { ChatThread } from '../../chat/ChatThread';
import { refreshThread, type Thread } from '../../chat/actions';
import styles from '../../chat/chat.module.css';

export interface QueueRow {
  id: string;
  subject: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
  lastMessageAt: string | null;
  lastMessage: string | null;
  parent: { id: string; name: string } | null;
  priority: boolean;
  unread: number;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'ახალი',
  ASSIGNED: 'მიმდინარე',
  RESOLVED: 'დასრულებული',
  CLOSED: 'დახურული',
};

/**
 * ოპერატორის სამუშაო ადგილი.
 *
 * მარცხნივ რიგი, მარჯვნივ არჩეული საუბარი. რიგის თანმიმდევრობას
 * სერვერი განსაზღვრავს — პრიორიტეტული პაკეტი წინ დგას.
 */
export function ChatQueue({ rows, first }: { rows: QueueRow[]; first: Thread | null }) {
  const [thread, setThread] = useState<Thread | null>(first);
  const [activeId, setActiveId] = useState<string | null>(first?.id ?? null);
  const [, startTransition] = useTransition();

  const open = (id: string) => {
    setActiveId(id);
    startTransition(async () => {
      const next = await refreshThread(id, true);
      setThread(next);
    });
  };

  return (
    <div className={styles.layout}>
      <div className={styles.queue}>
        {!rows.length && <p className={styles.empty}>შეკითხვები ჯერ არ არის.</p>}

        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => open(row.id)}
            className={`${styles.queueRow} ${row.id === activeId ? styles.queueRowActive : ''}`}
          >
            <div className={styles.queueMain}>
              <div className={styles.queueName}>{row.parent?.name ?? 'მშობელი'}</div>
              <div className={styles.queuePreview}>{row.lastMessage ?? row.subject}</div>
              <div className={styles.statusTag}>{STATUS_LABELS[row.status] ?? row.status}</div>
            </div>

            {row.priority && <span className={styles.priorityTag}>პრიორიტეტი</span>}
            {row.unread > 0 && <span className={styles.unreadTag}>{row.unread}</span>}
          </button>
        ))}
      </div>

      {thread ? (
        <ChatThread thread={thread} staff />
      ) : (
        <p className={styles.empty}>აირჩიეთ საუბარი მარცხნიდან.</p>
      )}
    </div>
  );
}
