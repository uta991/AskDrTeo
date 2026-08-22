'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteVideo, updateVideo, type AdminVideo, type VideoState } from './actions';
import styles from '../admin.module.css';

const STATUS_LABELS: Record<AdminVideo['status'], string> = {
  DRAFT: 'მონახაზი',
  PROCESSING: 'მუშავდება',
  PUBLISHED: 'გამოქვეყნებული',
  ARCHIVED: 'დაარქივებული',
};

const ACCESS_LABELS: Record<AdminVideo['accessType'], string> = {
  FREE: 'უფასო — ყველა პაკეტი ხედავს',
  AUTHENTICATED: 'ავტორიზებულებისთვის',
  SUBSCRIPTION: 'ფასიანი პაკეტებისთვის',
  SPECIFIC_PLANS: 'მხოლოდ არჩეული პაკეტები',
};

function Save() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'ინახება…' : 'შენახვა'}
    </button>
  );
}

function Remove() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.purgeLink} disabled={pending}>
      {pending ? 'იშლება…' : 'წაშლა'}
    </button>
  );
}

export function VideoRow({ video }: { video: AdminVideo }) {
  const [saveState, saveAction] = useActionState<VideoState, FormData>(updateVideo, {});
  const [removeState, removeAction] = useActionState<VideoState, FormData>(deleteVideo, {});

  return (
    <article className={styles.newsCard}>
      <div className={styles.newsHead}>
        <strong>{video.title}</strong>
        <span className={video.status === 'PUBLISHED' ? styles.badgeActive : styles.badgeOff}>
          {STATUS_LABELS[video.status]}
        </span>
      </div>

      <div className={styles.promoMeta}>
        <span>{video.category?.name ?? 'კატეგორიის გარეშე'}</span>
        <span>{video.createdAt.slice(0, 10)}</span>
      </div>

      <form action={saveAction} className={styles.formRow}>
        <input type="hidden" name="id" value={video.id} />

        <label className={styles.miniField}>
          <span className={styles.miniLabel}>ვინ ხედავს</span>
          <select name="accessType" defaultValue={video.accessType} className={styles.input}>
            {Object.entries(ACCESS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.miniField}>
          <span className={styles.miniLabel}>სტატუსი</span>
          <select name="status" defaultValue={video.status} className={styles.input}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.miniField}>
          <span className={styles.miniLabel}>&nbsp;</span>
          <Save />
        </div>
      </form>

      {!!saveState.error && <p className={styles.actionError}>{saveState.error}</p>}
      {!!saveState.notice && <p className={styles.actionNotice}>{saveState.notice}</p>}
      {!!removeState.error && <p className={styles.actionError}>{removeState.error}</p>}

      <form action={removeAction}>
        <input type="hidden" name="id" value={video.id} />
        <Remove />
      </form>
    </article>
  );
}
