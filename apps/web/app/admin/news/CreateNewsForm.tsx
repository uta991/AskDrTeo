'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createNews, type NewsState } from './actions';
import styles from '../admin.module.css';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'ქვეყნდება…' : 'გამოქვეყნება'}
    </button>
  );
}

/** სიახლის დამატება — ტექსტი და სურვილისამებრ ვიდეო. */
export function CreateNewsForm({ canAttachVideo }: { canAttachVideo: boolean }) {
  const [state, formAction] = useActionState<NewsState, FormData>(createNews, {});
  const [videoName, setVideoName] = useState<string | null>(null);

  return (
    <form action={formAction} className={styles.newsForm}>
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
            {videoName ?? '+ ვიდეოს მიმაგრება (არასავალდებულო)'}
          </span>
          <input
            name="video"
            type="file"
            accept="video/*"
            className={styles.fileInput}
            onChange={(event) => setVideoName(event.target.files?.[0]?.name ?? null)}
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

      {!!state.error && <p className={styles.actionError}>{state.error}</p>}
      {!!state.notice && <p className={styles.actionNotice}>{state.notice}</p>}

      <Submit />
    </form>
  );
}
