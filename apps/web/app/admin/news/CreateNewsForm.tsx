'use client';

import { useActionState, useEffect, useRef, useState, startTransition } from 'react';
import { createNews, requestVideoTicket, type NewsState } from './actions';
import styles from '../admin.module.css';

/** სერვერის დასაშვები ტიპები — upload-policy.service.ts-ის RULES.video */
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime'];

type Phase = 'idle' | 'ticket' | 'uploading' | 'saving';

/**
 * ფაილი ბრაუზერიდან პირდაპირ Bunny-ს მიდის (TUS).
 *
 * server action 1MB-ზე მეტს არ იღებს — ვიდეო მას ვერასდროს გაივლიდა.
 * სერვერი მხოლოდ ხელს აწერს; API გასაღები ბრაუზერამდე არ მოდის.
 * ატვირთვა განახლებადია: ქსელის გაწყვეტისას იქიდან გრძელდება, სადაც
 * შეჩერდა, და არა თავიდან.
 */
async function uploadDirect(
  file: File,
  title: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  const { ticket, error } = await requestVideoTicket({
    title,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!ticket) throw new Error(error ?? 'ატვირთვის ნებართვა ვერ მივიღეთ');

  const { Upload } = await import('tus-js-client');
  const { upload } = ticket;

  await new Promise<void>((resolve, reject) => {
    const tus = new Upload(file, {
      endpoint: upload.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: upload.signature,
        AuthorizationExpire: String(upload.expires),
        VideoId: upload.providerVideoId,
        LibraryId: upload.libraryId,
      },
      metadata: { filetype: file.type, title },
      // ყოველი ბილეთი ახალი ჩანაწერია — ძველ ატვირთვაზე „გაგრძელება"
      // ფაილს სხვა ვიდეოში ჩაწერდა
      storeFingerprintForResuming: false,
      onProgress: (sent, total) => onProgress(total ? Math.round((sent / total) * 100) : 0),
      onError: (err) => reject(new Error(`ვიდეო ვერ აიტვირთა: ${err.message}`)),
      onSuccess: () => resolve(),
    });
    tus.start();
  });

  return ticket.videoId;
}

/** სიახლის დამატება — ტექსტი და სურვილისამებრ ვიდეო. */
export function CreateNewsForm({ canAttachVideo }: { canAttachVideo: boolean }) {
  const [state, formAction, saving] = useActionState<NewsState, FormData>(createNews, {});
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // გამოქვეყნების შემდეგ ფორმა სუფთავდება — შემდეგი სიახლისთვის
  useEffect(() => {
    if (!state.notice) return;
    formRef.current?.reset();
    if (fileRef.current) fileRef.current.value = '';
    setFile(null);
    setProgress(0);
  }, [state]);

  // სერვერის პასუხი მოვიდა — დატვირთვის მდგომარეობა სრულდება
  useEffect(() => {
    if (!saving) setPhase('idle');
  }, [saving]);

  const busy = phase !== 'idle' || saving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setLocalError(null);

    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') ?? '').trim();

    try {
      if (file) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error('დასაშვებია მხოლოდ MP4 ან MOV ვიდეო');
        }

        setPhase('ticket');
        setProgress(0);
        const videoId = await uploadDirect(file, title || 'ვიდეო', (percent) => {
          setPhase('uploading');
          setProgress(percent);
        });
        data.set('videoId', videoId);
      }

      setPhase('saving');
      startTransition(() => formAction(data));
    } catch (error) {
      setPhase('idle');
      setLocalError(error instanceof Error ? error.message : 'ვიდეო ვერ აიტვირთა');
    }
  }

  const buttonLabel =
    phase === 'ticket'
      ? 'მზადდება…'
      : phase === 'uploading'
        ? `იტვირთება… ${progress}%`
        : busy
          ? 'ქვეყნდება…'
          : 'გამოქვეყნება';

  const error = localError ?? state.error;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={styles.newsForm}>
      <input name="title" placeholder="სათაური" className={styles.input} required />

      <textarea
        name="body"
        placeholder="ტექსტი — რას ეუბნებით მშობლებს"
        className={styles.textarea}
        rows={5}
        required
      />

      {/* ვიდეოს მიბმა ადმინის უფლებაა — ოპერატორს მხოლოდ ტექსტი შეუძლია */}
      {canAttachVideo && (
        <label className={styles.videoPicker}>
          <span className={styles.videoLabel}>
            {file?.name ?? '+ ვიდეოს მიმაგრება (არასავალდებულო)'}
          </span>
          {/* name განზრახ არ აქვს: ფაილი server action-ში არ უნდა მოხვდეს */}
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            className={styles.fileInput}
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      )}

      <div className={styles.formRow}>
        <label className={styles.miniField}>
          <span className={styles.miniLabel}>ჩვენება იწყება (ცარიელი = მაშინვე)</span>
          <input name="visibleFrom" type="date" className={styles.input} />
        </label>

        <label className={styles.miniField}>
          <span className={styles.miniLabel}>ჩვენება მთავრდება (ცარიელი = უვადოდ)</span>
          <input name="visibleUntil" type="date" className={styles.input} />
        </label>
      </div>

      <label className={styles.terms}>
        <input type="checkbox" name="notify" defaultChecked />
        <span>შეტყობინება გაეგზავნოს მშობლებს</span>
      </label>

      {phase === 'uploading' && (
        <progress className={styles.uploadProgress} value={progress} max={100} />
      )}

      {!!error && <p className={styles.actionError}>{error}</p>}
      {!!state.notice && !busy && <p className={styles.actionNotice}>{state.notice}</p>}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {buttonLabel}
      </button>
    </form>
  );
}
