'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteNews, type NewsState } from './actions';
import styles from '../admin.module.css';

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  visibleFrom: string | null;
  visibleUntil: string | null;
  publishAfterVideo?: boolean;
  video?: { id: string; title: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'მონახაზი',
  PUBLISHED: 'გამოქვეყნებული',
  ARCHIVED: 'დაარქივებული',
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.dangerButton} disabled={pending}>
      {pending ? 'იშლება…' : 'დიახ, წაშალე'}
    </button>
  );
}

/** ჩვენების ფანჯრის აღწერა ადამიანურ ენაზე. */
function windowLabel(from: string | null, until: string | null): string {
  if (!from && !until) return 'ჩანს უვადოდ';
  if (from && until) return `${from.slice(0, 10)} — ${until.slice(0, 10)}`;
  if (from) return `${from.slice(0, 10)}-დან`;
  return `${until!.slice(0, 10)}-მდე`;
}

export function NewsRow({ post }: { post: NewsPost }) {
  const [state, action] = useActionState<NewsState, FormData>(deleteNews, {});
  const [confirming, setConfirming] = useState(false);

  const expired = !!post.visibleUntil && new Date(post.visibleUntil) < new Date();

  return (
    <article className={styles.newsCard}>
      <div className={styles.newsHead}>
        <strong>{post.title}</strong>
        <span className={post.status === 'PUBLISHED' && !expired ? styles.badgeActive : styles.badgeOff}>
          {post.publishAfterVideo
            ? 'ვიდეო მუშავდება'
            : expired
              ? 'ვადა გასული'
              : (STATUS_LABELS[post.status] ?? post.status)}
        </span>
      </div>

      <p className={styles.newsBody}>{post.body}</p>

      <div className={styles.promoMeta}>
        <span>{(post.publishedAt ?? post.createdAt).slice(0, 10)}</span>
        <span>{windowLabel(post.visibleFrom, post.visibleUntil)}</span>
        {!!post.video && <span>ვიდეო მიმაგრებულია</span>}
        {post.publishAfterVideo && <span>დამუშავების შემდეგ თავად გამოქვეყნდება</span>}
      </div>

      {!confirming ? (
        <button className={styles.purgeLink} onClick={() => setConfirming(true)}>
          წაშლა
        </button>
      ) : (
        <div className={styles.confirmBox}>
          <p className={styles.confirmText}>
            სიახლე მშობლების ლენტიდან ქრება. გაგზავნილი შეტყობინება უკვე
            ვეღარ გაუქმდება.
          </p>
          <div className={styles.confirmRow}>
            <button className={styles.outlineButton} onClick={() => setConfirming(false)}>
              გაუქმება
            </button>
            <form action={action}>
              <input type="hidden" name="id" value={post.id} />
              <DeleteButton />
            </form>
          </div>
        </div>
      )}

      {!!state.error && <p className={styles.actionError}>{state.error}</p>}
    </article>
  );
}
