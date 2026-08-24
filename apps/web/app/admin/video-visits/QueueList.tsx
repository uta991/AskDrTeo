'use client';

import { useEffect, useState } from 'react';
import { queuePresence, type QueueVisit } from './actions';
import { QueueRow } from './QueueRow';
import styles from './queue.module.css';

/** რიგს ხშირად ვამოწმებთ — ექიმმა მშობლის შემოსვლა მაშინვე უნდა დაინახოს. */
const POLL_MS = 6000;

/**
 * დღის რიგი ცოცხალი მდგომარეობით.
 *
 * გვერდი სერვერზე იხატება, მაგრამ „მშობელი ჩართულია" გადატვირთვას
 * არ უნდა ელოდებოდეს — ექიმი ამ ნიშანს ელოდება, რომ ჩაერთოს.
 */
export function QueueList({
  visits,
  canConduct,
  date,
}: {
  visits: QueueVisit[];
  canConduct: boolean;
  date: string;
}) {
  const [waiting, setWaiting] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(visits.map((visit) => [visit.id, visit.parentWaiting])),
  );

  useEffect(() => {
    const tick = async () => {
      const fresh = await queuePresence(date).catch(() => null);
      if (fresh) setWaiting(fresh);
    };

    const timer = setInterval(() => void tick(), POLL_MS);
    return () => clearInterval(timer);
  }, [date]);

  return (
    <div className={styles.list}>
      {visits.map((visit) => (
        <QueueRow
          key={visit.id}
          visit={visit}
          canConduct={canConduct}
          waiting={waiting[visit.id] ?? false}
        />
      ))}
    </div>
  );
}
