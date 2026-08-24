'use client';

import { useState, useTransition } from 'react';
import { toggleChecklistItem } from '../actions/guides';
import styles from './guide.module.css';

interface Group {
  key: string;
  title: string;
  items: { key: string; label: string; hint?: string; done: boolean }[];
}

/**
 * მოგზაურობის ჩეკლისტი.
 *
 * მონიშვნა მაშინვე ჩანს და მხოლოდ შემდეგ მიდის სერვერზე — ჩეკლისტს
 * სწრაფად ავსებენ და ყოველ დაჭერაზე ლოდინი აღიზიანებდა. შეცდომისას
 * მონიშვნა უკან ბრუნდება.
 */
export function Checklist({
  slug,
  groups,
  accent,
  childName,
}: {
  slug: string;
  groups: Group[];
  accent: string;
  childName: string | null;
}) {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(groups.flatMap((g) => g.items.filter((i) => i.done).map((i) => i.key))),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  const toggle = (key: string) => {
    const done = !checked.has(key);

    setChecked((prev) => {
      const next = new Set(prev);
      if (done) next.add(key);
      else next.delete(key);
      return next;
    });
    setError(null);

    startTransition(async () => {
      const result = await toggleChecklistItem(slug, key, done);

      if (result.error) {
        setError(result.error);
        setChecked((prev) => {
          const next = new Set(prev);
          if (done) next.delete(key);
          else next.add(key);
          return next;
        });
      }
    });
  };

  return (
    <section className={styles.section}>
      <div className={styles.checklistHead}>
        <h2 className={styles.sectionTitle}>
          ჩეკლისტი{childName ? ` — ${childName}` : ''}
        </h2>
        <span className={styles.progress} style={{ color: accent }}>
          {checked.size} / {total}
        </span>
      </div>

      {!!error && <p className={styles.error}>{error}</p>}

      <div className={styles.groups}>
        {groups.map((group) => (
          <div key={group.key} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.title}</h3>

            <ul className={styles.items}>
              {group.items.map((item) => {
                const done = checked.has(item.key);

                return (
                  <li key={item.key}>
                    <label className={styles.item}>
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggle(item.key)}
                        className={styles.box}
                        style={{ accentColor: accent }}
                      />
                      <span className={done ? styles.labelDone : undefined}>
                        {item.label}
                        {!!item.hint && <span className={styles.hint}>{item.hint}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
