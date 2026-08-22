import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import type { VideoCard } from '../page';
import styles from '../videos.module.css';

export default async function VideoPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { slug } = await params;
  const video = await apiFetch<VideoCard>(`/videos/${slug}`);

  // 403-ზეც null ბრუნდება — დახურულ ვიდეოზე პაკეტების გვერდი უფრო გამოსადეგია
  if (!video) notFound();

  return (
    <main className={styles.page}>
      <Link href="/videos" className={styles.back}>
        ← ბიბლიოთეკა
      </Link>

      <div className={styles.player}>
        {video.embedUrl ? (
          <div className={styles.frame}>
            <iframe
              src={video.embedUrl}
              title={video.title}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className={styles.iframe}
            />
          </div>
        ) : (
          <p className={styles.empty}>ვიდეო ჯერ მუშავდება — სცადეთ მოგვიანებით.</p>
        )}

        <h1 className={styles.playerTitle}>{video.title}</h1>
        {!!video.description && <p className={styles.playerText}>{video.description}</p>}
      </div>
    </main>
  );
}
