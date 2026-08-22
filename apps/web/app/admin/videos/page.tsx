import { redirect } from 'next/navigation';
import { apiFetch, getSessionUser } from '@/lib/session';
import { AdminNav } from '../AdminNav';
import { VideoRow } from './VideoRow';
import type { AdminVideo } from './actions';
import styles from '../admin.module.css';

export const metadata = { title: 'ვიდეოები — AskDrTeo' };

export default async function AdminVideosPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'PARENT') redirect('/account');

  const videos = await apiFetch<AdminVideo[]>('/admin/videos');

  return (
    <main className={styles.page}>
      <AdminNav user={user} active="videos" />

      <div className="container">
        <h2 className={styles.sectionTitle}>
          ვიდეოები <span className={styles.count}>({videos?.length ?? 0})</span>
        </h2>
        <p className={styles.hint}>
          „უფასო" ვიდეოს უფასო პაკეტიც ხედავს; დანარჩენი ფასიან პაკეტებშია.
          ვიდეო ბიბლიოთეკაში მხოლოდ გამოქვეყნებული ჩანს.
        </p>

        {!videos?.length ? (
          <p className={styles.empty}>ვიდეო ჯერ არ აგიტვირთავთ. სიახლის შექმნისას მიმაგრებული ვიდეო აქაც გამოჩნდება.</p>
        ) : (
          <div className={styles.userList}>
            {videos.map((video) => (
              <VideoRow key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
