'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CallStage } from './CallStage';
import {
  sendVisitMessage,
  uploadVisitPhoto,
  visitMessages,
  visitPresence,
  type Presence,
  type VisitMessage,
} from './actions';
import { timeTbilisi } from '@/lib/time';
import styles from './visit.module.css';

/** ჩატი წამში ერთხელ არ განახლდება — სამი წამი საკმარისია და სერვერს იშურებს. */
const POLL_MS = 3000;

/** ყოფნის ნიშანი უფრო ხშირად — მეორე მხარის შემოსვლა მაშინვე უნდა ჩანდეს. */
const PRESENCE_MS = 5000;

/**
 * ვიდეო ოთახი.
 *
 * მარცხნივ ვიდეო, მარჯვნივ ჩატი: საუბრის დროს ხშირად საჭიროა
 * ფოტოს გაგზავნა — გამონაყარი, ანალიზის ფურცელი, პრეპარატის კოლოფი.
 * ვიდეოში მათი ჩვენება არ გამოდის, ამიტომ ჩატი გვერდითვეა.
 */
export function VisitRoom({
  visitId,
  call,
  admin,
  meId,
  title,
}: {
  visitId: string;
  /** არხი და ტოკენი — ინტერფეისს თავად ვხატავთ */
  call: { appId: string; channel: string; token: string; uid: number };
  admin: boolean;
  meId: string;
  title: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<VisitMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const thread = await visitMessages(visitId, admin);
    if (thread) setMessages(thread.messages);
  }, [visitId, admin]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // ყოფნის ნიშანი — ერთდროულად „აქ ვარ" და „მეორე მხარე შემოვიდა?"
  useEffect(() => {
    const ping = async () => {
      const result = await visitPresence(visitId, admin).catch(() => null);
      if (result) setPresence(result);
    };

    void ping();
    const timer = setInterval(() => void ping(), PRESENCE_MS);
    return () => clearInterval(timer);
  }, [visitId, admin]);

  // ახალი შეტყობინება ყოველთვის ხედში უნდა იყოს
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [messages.length]);

  const send = async (body: string, assetIds: string[] = []) => {
    setError(null);
    const result = await sendVisitMessage(visitId, admin, body, assetIds);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDraft('');
    await load();
  };

  const pickPhoto = async (file: File) => {
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append('file', file);

    const uploaded = await uploadVisitPhoto(form);
    setUploading(false);

    if (uploaded.error || !uploaded.id) {
      setError(uploaded.error ?? 'ატვირთვა ვერ მოხერხდა');
      return;
    }

    await send('', [uploaded.id]);
  };

  const otherPresent = admin ? !!presence?.parentPresent : !!presence?.staffPresent;

  const otherLabel = admin
    ? otherPresent
      ? `${presence?.parentName ?? 'მშობელი'} ჩართულია`
      : 'მშობელი ჯერ არ შემოსულა'
    : otherPresent
      ? `${presence?.staffName ?? 'ექიმი'} ჩართულია`
      : 'ელოდება ექიმის ჩართვას';

  return (
    <div className={styles.room}>
      <div className={styles.roomHead}>
        <Link href={admin ? '/admin/video-visits' : '/video-visit'} className={styles.back}>
          ← დასრულება
        </Link>
        <strong>{title}</strong>

        {/* მეორე მხარე ოთახშია თუ ჯერ არა — ეს მთავარი კითხვაა ზარის დასაწყისში */}
        <span
          className={`${styles.presence} ${otherPresent ? styles.presenceOn : ''}`}
        >
          <span className={styles.dot} />
          {otherLabel}
        </span>
      </div>

      <div className={styles.roomBody}>
        <CallStage
          visitId={visitId}
          admin={admin}
          appId={call.appId}
          channel={call.channel}
          token={call.token}
          uid={call.uid}
          onLeave={() => router.push(admin ? '/admin/video-visits' : '/video-visit')}
        />

        <aside className={styles.chat}>
          <h3 className={styles.chatTitle}>ჩატი</h3>

          <div ref={feedRef} className={styles.feed}>
            {!messages.length && (
              <p className={styles.chatEmpty}>
                აქ შეგიძლიათ ტექსტისა და ფოტოს გაგზავნა საუბრის პარალელურად.
              </p>
            )}

            {messages.map((message) => {
              const mine = message.senderId === meId;

              return (
                <div
                  key={message.id}
                  className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}
                >
                  {!mine && !!message.sender && (
                    <span className={styles.bubbleAuthor}>{message.sender.firstName}</span>
                  )}

                  {!!message.body && <p className={styles.bubbleText}>{message.body}</p>}

                  {message.attachments.map((attachment) =>
                    attachment.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={attachment.id}
                        src={attachment.url}
                        alt=""
                        className={styles.bubbleImage}
                      />
                    ) : (
                      <span key={attachment.id} className={styles.bubbleMeta}>
                        ფაილი მუშავდება…
                      </span>
                    ),
                  )}

                  <span className={styles.bubbleTime}>
                    {timeTbilisi(message.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>

          {!!error && <p className={styles.error}>{error}</p>}

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void pickPhoto(file);
                event.target.value = '';
              }}
            />

            <button
              type="button"
              className={styles.attach}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              aria-label="ფოტოს გაგზავნა"
            >
              {uploading ? '…' : '📎'}
            </button>

            <input
              className={styles.composerInput}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="დაწერეთ შეტყობინება"
              maxLength={4000}
            />

            <button type="submit" className={styles.sendButton} disabled={!draft.trim()}>
              გაგზავნა
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
