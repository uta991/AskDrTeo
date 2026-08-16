'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { SessionUser } from '@/lib/session';
import { logout } from '../actions/auth';
import styles from './user-menu.module.css';

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'მშობელი',
  OPERATOR: 'ოპერატორი',
  ADMIN: 'ადმინისტრატორი',
  SUPER_ADMIN: 'მთავარი ადმინისტრატორი',
};

/**
 * ზედა მარჯვენა კუთხის მენიუ.
 *
 * ადრე იქ პირდაპირ „გასვლა" ეწერა — ყველაზე იშვიათი მოქმედება ყველაზე
 * თვალსაჩინო ადგილას იდგა და შემთხვევით დაჭერის რისკიც ჰქონდა. ახლა
 * პროფილია, გასვლა კი სიის ბოლოშია.
 *
 * იხსნება როგორც კურსორის მიტანაზე (კომპიუტერზე), ისე დაჭერაზე —
 * სენსორულ ეკრანზე hover არ არსებობს.
 */
export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // გარეთ დაჭერა და Escape მენიუს ხურავს
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <Link href="/login" className={styles.login}>
        შესვლა
      </Link>
    );
  }

  const isStaff = user.role !== 'PARENT';
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const canManageContent = user.role === 'ADMIN' || isSuperAdmin;

  return (
    <div
      ref={wrapper}
      className={styles.wrapper}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles.avatar}>
          {user.firstName.slice(0, 1)}
          {user.lastName.slice(0, 1)}
        </span>
        <span className={styles.triggerText}>პროფილი</span>
        <span className={styles.chevron} aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.identity}>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>

          <Link href="/profile" className={styles.item} role="menuitem">
            პროფილი
          </Link>

          {!isStaff && (
            <>
              <Link href="/account" className={styles.item} role="menuitem">
                ჩემი კაბინეტი
              </Link>
              <Link href="/account/child" className={styles.item} role="menuitem">
                ბავშვის დამატება
              </Link>
            </>
          )}

          {isStaff && (
            <>
              <Link href="/admin" className={styles.item} role="menuitem">
                სამართავი პანელი
              </Link>
              <Link href="/profile" className={styles.item} role="menuitem">
                მშობლები
              </Link>
              {isSuperAdmin && (
                <Link href="/profile" className={styles.item} role="menuitem">
                  შიდა მომხმარებლები
                </Link>
              )}
              {canManageContent && (
                <>
                  <Link href="/profile" className={styles.item} role="menuitem">
                    პრომო კოდები
                  </Link>
                  <Link href="/profile" className={styles.item} role="menuitem">
                    წამლების ცნობარი
                  </Link>
                </>
              )}
            </>
          )}

          <Link href="/calculator" className={styles.item} role="menuitem">
            დოზის კალკულატორი
          </Link>

          {/* გასვლა ბოლოშია და ცალკე გამოყოფილი — შემთხვევით არ დაიჭირო */}
          <form action={logout} className={styles.logoutForm}>
            <button className={styles.logout} role="menuitem">
              გასვლა
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
