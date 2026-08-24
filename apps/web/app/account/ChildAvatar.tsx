'use client';

import { useEffect, useState } from 'react';
import styles from './child-avatar.module.css';

/**
 * ბავშვის ფოტო მისალმების გვერდით.
 *
 * დაჭერით იხსნება დიდი ხედი — პატარა წრეში სახე კარგად არ ჩანს,
 * მშობელს კი სწორედ ფოტოს ნახვა უნდა.
 */
export function ChildAvatar({
  url,
  name,
  meta,
}: {
  url: string | null;
  name: string;
  /** ასაკი და წონა — დიდ ხედში სათაურის ქვეშ */
  meta: string;
}) {
  const [open, setOpen] = useState(false);

  // Esc-ით დახურვა — მოდალის ჩვეული ქცევა
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const initial = name.trim().charAt(0) || '👶';

  return (
    <>
      <button
        type="button"
        className={styles.thumb}
        onClick={() => url && setOpen(true)}
        // ფოტოს გარეშე გასადიდებელი არაფერია — ღილაკი მხოლოდ ასოს აჩვენებს
        disabled={!url}
        aria-label={url ? `${name} — ფოტოს გადიდება` : name}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} className={styles.image} />
        ) : (
          <span className={styles.initial}>{initial}</span>
        )}
      </button>

      {open && !!url && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={() => setOpen(false)}
        >
          {/* ფოტოზე დაჭერა ფანჯარას არ ხურავს — შემთხვევითი დახურვა აღიზიანებს */}
          <figure className={styles.figure} onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={name} className={styles.large} />
            <figcaption className={styles.caption}>
              <strong>{name}</strong>
              <span>{meta}</span>
            </figcaption>
          </figure>

          <button type="button" className={styles.close} aria-label="დახურვა">
            ×
          </button>
        </div>
      )}
    </>
  );
}
