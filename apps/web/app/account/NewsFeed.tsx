import styles from './account.module.css';

export interface NewsVideo {
  id: string;
  title: string | null;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  ready?: boolean;
}

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  createdAt: string;
  video?: NewsVideo | null;
}

/**
 * სიახლეების ლენტი.
 *
 * ვიდეო თავისივე შეტყობინების გვერდით დგას და არა საერთო პანელში —
 * ასე ერთი შეხედვით ჩანს, რომელ სიახლეს ეკუთვნის. ცალკე ღილაკი
 * არ სჭირდება: დამკვრელი მაშინვე ადგილზეა.
 */
export function NewsFeed({ posts }: { posts: NewsPost[] }) {
  return (
    <div className={styles.newsList}>
      {posts.map((post) => {
        const video = post.video;
        const playable = !!video?.embedUrl;

        return (
          <article
            key={post.id}
            className={`card ${playable ? styles.newsWithVideo : ''}`}
          >
            <div className={styles.newsText}>
              <div className={styles.newsDate}>
                {(post.publishedAt ?? post.createdAt).slice(0, 10)}
              </div>
              <h3 className={styles.newsHeading}>{post.title}</h3>
              <p className={styles.newsBody}>{post.body}</p>

              {/* გადაშიფვრისას ვიდეო ჯერ არ იკვრება — მიზეზი ნათლად უნდა ჩანდეს */}
              {!!video && !playable && (
                <div className={styles.videoPending}>
                  ვიდეო მუშავდება — ცოტა ხანში გამოჩნდება
                </div>
              )}
            </div>

            {playable && (
              <div className={styles.videoFrame}>
                <iframe
                  src={video!.embedUrl!}
                  title={video!.title ?? post.title}
                  loading="lazy"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
