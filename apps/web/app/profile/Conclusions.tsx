'use client';

import { useState } from 'react';
import { formatTbilisi } from '@/lib/time';
import styles from './profile.module.css';

export interface Conclusion {
  id: string;
  date: string;
  concludedAt: string | null;
  diagnosis: string;
  diagnosisNote: string | null;
  prescription: string | null;
  child: { id: string; firstName: string } | null;
  doctorName: string;
}

/**
 * ექიმის დასკვნები.
 *
 * სია დაკეცილია — მშობელს ჩვეულებრივ ბოლო ვიზიტი აინტერესებს.
 * PDF ცალკე ჩანართში იხსნება, რომ დასაბეჭდად და აფთიაქში წასაღებად
 * ხელთ ჰქონდეს.
 */
export function Conclusions({ items }: { items: Conclusion[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!items.length) {
    return (
      <p className={styles.empty}>
        ჯერ არ არის. ონლაინ ვიზიტის შემდეგ ექიმის დასკვნა აქ გამოჩნდება.
      </p>
    );
  }

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const open = openId === item.id;

        return (
          <article key={item.id} className={styles.conclusion}>
            <button
              type="button"
              className={styles.conclusionHead}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span className={styles.conclusionMain}>
                <strong>{item.diagnosis}</strong>
                <span className={styles.conclusionMeta}>
                  {formatTbilisi(item.concludedAt ?? item.date)}
                  {item.child ? ` · ${item.child.firstName}` : ''} · {item.doctorName}
                </span>
              </span>

              <span className={styles.conclusionArrow}>{open ? '−' : '+'}</span>
            </button>

            {open && (
              <div className={styles.conclusionBody}>
                {!!item.diagnosisNote && (
                  <p className={styles.conclusionText}>{item.diagnosisNote}</p>
                )}

                {!!item.prescription && (
                  <>
                    <h4 className={styles.conclusionLabel}>დანიშნულება</h4>
                    <p className={styles.conclusionText}>{item.prescription}</p>
                  </>
                )}

                <a
                  href={`/api/conclusion/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.pdfLink}
                >
                  PDF-ის გახსნა
                </a>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
