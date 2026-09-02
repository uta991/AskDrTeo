'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  closeConversation,
  refreshThread,
  sendParentMessage,
  sendStaffMessage,
  startConversation,
  takeConversation,
  uploadAttachment,
  type ChatMessage,
  type Thread,
} from './actions';
import styles from './chat.module.css';

const STAFF_ROLES = ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'];

/** ახალი შეტყობინების მოსატანი ინტერვალი — websocket-ის გარეშე ესეც საკმარისია. */
const POLL_MS = 12_000;

/**
 * ჩვენი მხრიდან წერილია თუ არა.
 *
 * ავტორის გარეშე შეტყობინება ავტომატური პასუხია — მშობელს ყოველთვის
 * ავტორი აქვს, ამიტომ ცარიელი ავტორი ჩვენს მხარეს ნიშნავს.
 */
function isStaffMessage(message: ChatMessage): boolean {
  if (!message.sender) return true;
  return STAFF_ROLES.includes(message.sender.role);
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
/**
 * ხშირად დასმული კითხვები.
 *
 * ცარიელი ველი მშობელს აჩერებს — არ იცის, რა ჰკითხოს და როგორ
 * ჩამოაყალიბოს. მზა კითხვა პირველ ნაბიჯს ხსნის; დაჭერისთანავე
 * ტექსტში ჩაჯდება, რომ საჭიროებისამებრ შეასწოროს.
 */
const SUGGESTIONS = [
  'ცხელება აქვს — როდის მივმართო ექიმს?',
  'გამონაყარი გამოუჩნდა, ფოტოს გამოგიგზავნით',
  'რამდენი უნდა ეძინოს ამ ასაკში?',
  'კვებაზე უარს ამბობს — რა ვქნა?',
  'აცრის შემდეგ ცხელება აქვს, ნორმალურია?',
  'რა დოზით მივცე წამალი?',
];

export function ChatThread({
  thread,
  staff = false,
}: {
  thread: Thread | null;
  staff?: boolean;
}) {
  // ცარიელ ჩატში ჯერ ღილაკია: შემკრები ველი მაშინ ჩნდება, როცა
  // მშობელმა საუბრის დაწყება გადაწყვიტა
  const [started, setStarted] = useState(!!thread);
  const [current, setCurrent] = useState<Thread | null>(thread);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // მიმაგრებული, მაგრამ ჯერ გაუგზავნელი ფაილები
  const [attachments, setAttachments] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(thread);
    if (thread) setStarted(true);
  }, [thread]);

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

  const upload = (file: File) => {
    setError(null);
    setUploading(true);

    const form = new FormData();
    form.append('file', file);

    void uploadAttachment(form)
      .then((result) => {
        if (result.error) setError(result.error);
        else if (result.id) setAttachments((prev) => [...prev, { id: result.id!, name: file.name }]);
      })
      .finally(() => setUploading(false));
  };

  // მშობელს უკვე დაუწერია თუ არა — მინიშნებები მხოლოდ მანამდე ჩანს
  const parentWrote = !!current?.messages.some((message) => !isStaffMessage(message));

  const send = () => {
    const text = input.trim();
    if ((!text && !attachments.length) || pending) return;

    const assetIds = attachments.map((item) => item.id);

    setError(null);
    setInput('');
    setAttachments([]);

    startTransition(async () => {
      const result = staff
        ? await sendStaffMessage(current!.id, text, assetIds)
        : await sendParentMessage(text, current?.id, assetIds);

      if (result.error) {
        setError(result.error);
        return;
      }

      // პირველ წერილზე საუბარი ახლა შეიქმნა — ძაფი id-ით მოგვაქვს,
      // თორემ ავტომატური პასუხი გვერდის განახლებამდე არ გამოჩნდებოდა
      const id = current?.id ?? result.conversationId;
      if (!id) return;

      const next = await refreshThread(id, staff);
      if (next) setCurrent(next);
    });
  };

  return (
    <div className={styles.thread}>
      {staff && !!current && (
        <div className={styles.threadHead}>
          <span className={styles.threadSubject}>{current.subject ?? 'შეკითხვა'}</span>

          {/* აღება მშობელს ოპერატორის სახელით ესალმება */}
          {!closed && current.status === 'OPEN' && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await takeConversation(current.id);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  const next = await refreshThread(current.id, true);
                  if (next) setCurrent(next);
                })
              }
            >
              საუბრის აღება
            </button>
          )}

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

      {/* ახალი საუბრის დაწყება — მშობელს ცარიელი ველი არ ხვდება */}
      {!staff && !started && (
        <div className={styles.startBox}>
          <p className={styles.startText}>
            შეკითხვა გაქვთ ბავშვის ჯანმრთელობაზე? კონსულტანტი სამუშაო საათებში
            გიპასუხებთ.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setStarted(true);

                const result = await startConversation();
                if (result.error) {
                  setError(result.error);
                  return;
                }

                if (result.conversationId) {
                  const next = await refreshThread(result.conversationId, false);
                  if (next) setCurrent(next);
                }
              })
            }
          >
            {pending ? 'იხსნება…' : 'ჩატის დაწყება'}
          </button>

          <div className={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.suggestion}
                onClick={() => setInput(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {(staff || started) && (
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
              {/* სახელით — ერთ საუბარს რამდენიმე ოპერატორი პასუხობს და
                  მშობელმა უნდა იცოდეს, ვის ელაპარაკება */}
              {!mine && (
                <span className={styles.author}>
                  {message.sender?.firstName ?? 'AskDrTeo'}
                </span>
              )}
              {!!message.body && <span className={styles.body}>{message.body}</span>}

              {message.attachments?.map((attachment) =>
                attachment.type === 'VIDEO' ? (
                  <span key={attachment.id} className={styles.attachment}>
                    {attachment.url ? (
                      <iframe
                        src={attachment.url}
                        title="ვიდეო"
                        allow="encrypted-media; fullscreen; picture-in-picture"
                        allowFullScreen
                        className={styles.attachmentVideo}
                      />
                    ) : (
                      <span className={styles.attachmentPending}>ვიდეო მუშავდება…</span>
                    )}
                  </span>
                ) : attachment.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
                    <img src={attachment.url} alt="" className={styles.attachmentImage} />
                  </a>
                ) : (
                  <span key={attachment.id} className={styles.attachmentPending}>
                    ფაილი ვერ ჩაიტვირთა
                  </span>
                ),
              )}

              <span className={styles.time}>{time(message.createdAt)}</span>
            </div>
          );
        })}

        {!!error && <p className={styles.error}>{error}</p>}
        <div ref={endRef} />
      </div>
      )}

      {closed ? (
        <p className={styles.closedNote}>
          საუბარი დახურულია.{!staff && ' ახალი შეკითხვა ქვემოთ დაწერეთ — ცალკე საუბრად შეინახება.'}
        </p>
      ) : null}

      {attachments.length > 0 && (
        <div className={styles.pendingFiles}>
          {attachments.map((item) => (
            <span key={item.id} className={styles.pendingFile}>
              {item.name}
              <button
                type="button"
                className={styles.removeFile}
                onClick={() => setAttachments((prev) => prev.filter((f) => f.id !== item.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/*
        მზა კითხვები — მშობელს, სანამ თავად არაფერი დაუწერია.
        ოპერატორის ავტომატური პასუხი მათ არ ხურავს: მშობელს სწორედ
        მაშინ სჭირდება მინიშნება, როცა პასუხის დაწერა უწევს.
      */}
      {!staff && started && !closed && !parentWrote && (
        <div className={styles.suggestions}>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={styles.suggestion}
              onClick={() => setInput(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {(staff || started) && (!closed || !staff) && (
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

          {/* ფოტო/ვიდეო — ტელეფონზე კამერას ხსნის, კომპიუტერზე ფაილს */}
          <label className={styles.attachButton} title="ფოტო ან ვიდეო">
            {uploading ? '…' : '+'}
            <input
              type="file"
              accept="image/*,video/*"
              className={styles.fileInput}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
                event.target.value = '';
              }}
            />
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || uploading || (!input.trim() && !attachments.length)}
          >
            გაგზავნა
          </button>
        </form>
      )}
    </div>
  );
}
