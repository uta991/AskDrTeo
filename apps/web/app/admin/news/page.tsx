import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { CreateNewsForm } from './CreateNewsForm';
import styles from '../admin.module.css';

export const metadata = { title: 'სიახლეები — AskDrTeo' };

interface NewsPost {
  id: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  video?: { id: string; title: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'მონახაზი',
  PUBLISHED: 'გამოქვეყნებული',
  ARCHIVED: 'დაარქივებული',
};

export default async function AdminNewsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'PARENT') redirect('/account');

  const posts = await apiFetch<NewsPost[]>('/admin/news');

  // ვიდეოს ატვირთვა ადმინის უფლებაა — ოპერატორი მხოლოდ ტექსტს წერს
  const canAttachVideo = user.role !== 'OPERATOR';

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="news" />

      <div className="container">
        <h2 className={styles.sectionTitle}>ახალი სიახლე</h2>
        <p className={styles.hint}>
          გამოქვეყნებული სიახლე მშობლებს მთავარ გვერდზე უჩნდებათ.
          {!canAttachVideo && ' ვიდეოს მიმაგრება ადმინისტრატორის უფლებაა.'}
        </p>

        <CreateNewsForm canAttachVideo={canAttachVideo} />

        <h2 className={styles.sectionTitle}>
          გამოქვეყნებული <span className={styles.count}>({posts?.length ?? 0})</span>
        </h2>

        {!posts?.length ? (
          <p className={styles.empty}>ჯერ არცერთი სიახლე არ დაგიმატებიათ.</p>
        ) : (
          <div className={styles.userList}>
            {posts.map((post) => (
              <article key={post.id} className={styles.newsCard}>
                <div className={styles.newsHead}>
                  <strong>{post.title}</strong>
                  <span className={post.status === 'PUBLISHED' ? styles.badgeActive : styles.badgeOff}>
                    {STATUS_LABELS[post.status] ?? post.status}
                  </span>
                </div>
                <p className={styles.newsBody}>{post.body}</p>
                <div className={styles.promoMeta}>
                  <span>{(post.publishedAt ?? post.createdAt).slice(0, 10)}</span>
                  {!!post.video && <span>ვიდეო მიმაგრებულია</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
