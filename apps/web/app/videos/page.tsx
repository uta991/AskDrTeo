import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { SunLogo } from '../components/Brand';
import styles from './videos.module.css';

export const metadata = { title: 'ვიდეო ბიბლიოთეკა — AskDrTeo' };

export interface VideoCard {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: { id: string; slug: string; name: string } | null;
  durationSec: number | null;
  thumbnailUrl: string | null;
  free: boolean;
  unlocked: boolean;
  processing: boolean;
  embedUrl: string | null;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

/** წამები „12:34" ფორმატში. */
function duration(sec: number | null): string | null {
  if (!sec) return null;
  const minutes = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const params = await searchParams;

  const [videos, categories] = await Promise.all([
    apiFetch<VideoCard[]>(`/videos${params.category ? `?category=${params.category}` : ''}`),
    apiFetch<Category[]>('/videos/categories'),
  ]);

  const locked = (videos ?? []).filter((video) => !video.unlocked).length;

  return (
    <main className={styles.page}>
      <Link href={user.role === 'PARENT' ? '/account' : '/admin'} className={styles.back}>
        ← უკან
      </Link>

      <div className={styles.head}>
        <SunLogo size={44} />
        <h1 className={styles.title}>ვიდეო ბიბლიოთეკა</h1>
        <p className={styles.subtitle}>დოქტორ თეოს ვიდეორჩევები ასაკების მიხედვით</p>
      </div>

      {!!categories?.length && (
        <div className={styles.categories}>
          <Link
            href="/videos"
            className={`${styles.categoryChip} ${!params.category ? styles.categoryChipActive : ''}`}
          >
            ყველა
          </Link>

          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/videos?category=${category.slug}`}
              className={`${styles.categoryChip} ${
                params.category === category.slug ? styles.categoryChipActive : ''
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {!videos?.length ? (
        <p className={styles.empty}>ბიბლიოთეკა ჯერ ცარიელია.</p>
      ) : (
        <div className={styles.grid}>
          {videos.map((video) => {
            const card = (
              <>
                <div className={styles.thumb}>
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnailUrl} alt="" className={styles.thumbImage} />
                  ) : (
                    <div className={styles.thumbEmpty}>
                      <SunLogo size={34} />
                    </div>
                  )}

                  {!video.unlocked && <span className={styles.lock}>პაკეტში არ შედის</span>}
                  {video.processing && <span className={styles.lock}>მუშავდება</span>}
                  {!!duration(video.durationSec) && (
                    <span className={styles.duration}>{duration(video.durationSec)}</span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <span className={styles.cardTitle}>{video.title}</span>
                  {!!video.category && (
                    <span className={styles.cardMeta}>{video.category.name}</span>
                  )}
                </div>
              </>
            );

            return video.unlocked ? (
              <Link key={video.id} href={`/videos/${video.slug}`} className={styles.card}>
                {card}
              </Link>
            ) : (
              <Link key={video.id} href="/plans" className={`${styles.card} ${styles.cardLocked}`}>
                {card}
              </Link>
            );
          })}
        </div>
      )}

      {locked > 0 && (
        <p className={styles.upgradeNote}>
          {locked} ვიდეო ფასიან პაკეტშია —{' '}
          <Link href="/plans" className={styles.link}>
            პაკეტების ნახვა
          </Link>
        </p>
      )}
    </main>
  );
}
