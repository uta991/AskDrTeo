'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  closeConversation,
  refreshThread,
  sendParentMessage,
  sendStaffMessage,
  type ChatMessage,
  type Thread,
} from './actions';
import styles from './chat.module.css';

const STAFF_ROLES = ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'];

/** ახალი შეტყობინების მოსატანი ინტერვალი — websocket-ის გარეშე ესეც საკმარისია. */
const POLL_MS = 12_000;

function isStaffMessage(message: ChatMessage): boolean {
  return !!message.sender && STAFF_ROLES.includes(message.sender.role);
}

function time(value: string): string {
  return new Date(value).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * საუბრის ძაფი.
 *
 * ერთი კომპონენტი ორივე მხარეს ემსახურება: მშობელს თავისი წერილები
 * მარჯვნივ უჩანს, ოპერატორს — თავისი. `staff` განსაზღვრავს რომელი
 * მხარეა ეს ბრაუზერი.
 */
export function ChatThread({
  thread,
  staff = false,
}: {
  thread: Thread | null;
  staff?: boolean;
}) {
  const [current, setCurrent] = useState<Thread | null>(thread);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCurrent(thread), [thread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [current?.messages.length, pending]);

  // ახალი შეტყობინებების მოტანა — გვერდის განახლების გარეშე
  useEffect(() => {
    if (!current?.id) return;

    const timer = setInterval(() => {
      void refreshThread(current.id, staff).then((next) => {
        if (next) setCurrent(next);
      });
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [current?.id, staff]);

  const closed = current?.status === 'CLOSED';

  const send = () => {
    const text = input.trim();
    if (!text || pending) return;

    setError(null);
    setInput('');

    startTransition(async () => {
      const result = staff
        ? await sendStaffMessage(current!.id, text)
        : await sendParentMessage(text, current?.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (current?.id) {
        const next = await refreshThread(current.id, staff);
        if (next) setCurrent(next);
      }
    });
  };

  return (
    <div className={styles.thread}>
      {staff && !!current && (
        <div className={styles.threadHead}>
          <span className={styles.threadSubject}>{current.subject ?? 'შეკითხვა'}</span>

          {!closed && (
            <button
              type="button"
              className={styles.closeButton}
              onClick={() =>
                startTransition(async () => {
                  await closeConversation(current.id);
                  const next = await refreshThread(current.id, true);
                  if (next) setCurrent(next);
                })
              }
            >
              საუბრის დახურვა
            </button>
          )}
        </div>
      )}

      <div className={styles.messages}>
        {!current?.messages.length && (
          <p className={styles.empty}>
            {staff
              ? 'შეტყობინებები ჯერ არ არის.'
              : 'დაწერეთ შეკითხვა — კონსულტანტი სამუშაო საათებში გიპასუხებთ.'}
          </p>
        )}

        {current?.messages.map((message) => {
          const fromStaff = isStaffMessage(message);
          const mine = staff ? fromStaff : !fromStaff;

          if (message.type === 'SYSTEM') {
            return (
              <div key={message.id} className={styles.system}>
                {message.body}
              </div>
            );
          }

          return (
            <div key={message.id} className={mine ? styles.bubbleMine : styles.bubbleTheirs}>
              {!mine && !!message.sender && (
                <span className={styles.author}>
                  {fromStaff ? 'კონსულტანტი' : message.sender.firstName}
                </span>
              )}
              <span className={styles.body}>{message.body}</span>
              <span className={styles.time}>{time(message.createdAt)}</span>
            </div>
          );
        })}

        {!!error && <p className={styles.error}>{error}</p>}
        <div ref={endRef} />
      </div>

      {closed ? (
        <p className={styles.closedNote}>
          საუბარი დახურულია.{!staff && ' ახალი შეკითხვისთვის დაწერეთ ქვემოთ.'}
        </p>
      ) : null}

      {(!closed || !staff) && (
        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={staff ? 'პასუხი…' : 'დაწერეთ შეკითხვა…'}
            className={styles.input}
            rows={2}
            maxLength={4000}
          />

          <button type="submit" className="btn btn-primary" disabled={pending || !input.trim()}>
            გაგზავნა
          </button>
        </form>
      )}
    </div>
  );
}
