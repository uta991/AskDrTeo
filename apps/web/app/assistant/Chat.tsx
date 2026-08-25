'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { askAssistant } from './actions';
import styles from './assistant.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatChild {
  id: string;
  firstName: string;
  ageLabel: string;
}

const SUGGESTIONS = [
  'რამდენი უნდა ეძინოს ჩემი ასაკის ბავშვს?',
  'როგორ დავიწყო დამატებითი კვება?',
  'ცხელება აქვს — როდის მივმართო ექიმს?',
];

/**
 * საუბარი ასისტენტთან.
 *
 * ისტორია ბრაუზერშია, საუბრის ძაფი კი `conversationId`-ით მიჰყვება
 * სერვერს — გვერდის განახლებამდე კითხვა-პასუხი კონტექსტს ინარჩუნებს.
 */
export function Chat({ profiles }: { profiles: ChatChild[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [childId, setChildId] = useState<string | undefined>(profiles[0]?.id);
  const [pending, startTransition] = useTransition();

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;

    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);

    startTransition(async () => {
      const result = await askAssistant(question, conversationId, childId);

      if (result.error) {
        setError(result.error);
        return;
      }

      setConversationId(result.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.answer ?? '' }]);
    });
  };

  return (
    <div className={styles.chat}>
      {profiles.length > 1 && (
        <div className={styles.childRow}>
          {profiles.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => setChildId(child.id)}
              className={`${styles.childChip} ${child.id === childId ? styles.childChipActive : ''}`}
            >
              {child.firstName} · {child.ageLabel}
            </button>
          ))}
        </div>
      )}

      <div className={styles.thread}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>
              დასვით შეკითხვა ბავშვის ჯანმრთელობაზე, კვებაზე, ძილსა თუ განვითარებაზე.
            </p>

            <div className={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}
          >
            {message.content}
          </div>
        ))}

        {pending && <div className={styles.typing}>ასისტენტი წერს…</div>}
        {!!error && <p className={styles.error}>{error}</p>}

        <div ref={endRef} />
      </div>

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            // Enter აგზავნის, Shift+Enter ახალ ხაზს ამატებს
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          placeholder="დაწერეთ შეკითხვა…"
          className={styles.input}
          rows={2}
          maxLength={2000}
        />

        <button type="submit" className="btn btn-primary" disabled={pending || !input.trim()}>
          გაგზავნა
        </button>
      </form>

      <p className={styles.disclaimer}>
        ასისტენტი დიაგნოზს არ სვამს და წამლის დოზას არ ასახელებს. საგანგაშო
        ნიშნებზე დაუყოვნებლივ მიმართეთ ექიმს.
      </p>
    </div>
  );
}
