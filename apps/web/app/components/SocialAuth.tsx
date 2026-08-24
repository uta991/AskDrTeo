'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { socialLogin } from '../actions/auth';
import styles from './social-auth.module.css';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

/**
 * Google-ითა და Apple-ით შესვლა.
 *
 * ერთი კომპონენტი ემსახურება შესვლასაც და რეგისტრაციასაც: თუ ანგარიში
 * არ არსებობს, სერვერი მას პროვაიდერის მონაცემებით ქმნის. ცალკე
 * „რეგისტრაციის" ღილაკი მომხმარებელს მხოლოდ დააბნევდა.
 *
 * ღილაკი მხოლოდ მაშინ ჩნდება, როცა შესაბამისი client id გვაქვს —
 * კონფიგურაციის გარეშე დაჭერა შეცდომით სრულდებოდა.
 */
export function SocialAuth({
  googleClientId,
  appleClientId,
}: {
  googleClientId?: string;
  appleClientId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);

  const googleSlot = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const finish = async (
    provider: 'google' | 'apple',
    token: string,
    firstName?: string,
    lastName?: string,
  ) => {
    setBusy(provider);
    setError(null);

    const result = await socialLogin(provider, token, firstName, lastName);

    if (result.error) {
      setError(result.error);
      setBusy(null);
      return;
    }

    // სესია cookie-შია — გვერდი თავიდან უნდა აეწყოს, რომ ის წაიკითხოს
    router.refresh();
    router.push('/account');
  };

  // Google-ის ღილაკს თავად ბიბლიოთეკა ხატავს — ეს Google-ის მოთხოვნაა
  useEffect(() => {
    if (!googleClientId || !googleSlot.current) return;

    const render = () => {
      if (!window.google || !googleSlot.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => void finish('google', response.credential),
      });

      window.google.accounts.id.renderButton(googleSlot.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        locale: 'ka',
        width: 320,
      });
    };

    if (window.google) render();
    else {
      const timer = setInterval(() => {
        if (window.google) {
          clearInterval(timer);
          render();
        }
      }, 200);

      return () => clearInterval(timer);
    }
  }, [googleClientId]);

  const appleSignIn = async () => {
    if (!window.AppleID || !appleClientId) return;

    setError(null);

    try {
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/login`,
        usePopup: true,
      });

      const response = await window.AppleID.auth.signIn();

      await finish(
        'apple',
        response.authorization.id_token,
        response.user?.name?.firstName,
        response.user?.name?.lastName,
      );
    } catch {
      // მომხმარებელმა ფანჯარა დახურა — ეს შეცდომა არ არის
      setBusy(null);
    }
  };

  if (!googleClientId && !appleClientId) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.divider}>
        <span>ან</span>
      </div>

      {!!googleClientId && (
        <>
          <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
          <div ref={googleSlot} className={styles.googleSlot} />
        </>
      )}

      {!!appleClientId && (
        <>
          <Script
            src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
            strategy="afterInteractive"
          />

          <button
            type="button"
            className={styles.appleButton}
            disabled={busy !== null}
            onClick={() => void appleSignIn()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
              <path d="M16.7 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.4-.9-2.4-3.6ZM14.4 5.9c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3Z" />
            </svg>
            {busy === 'apple' ? 'იხსნება…' : 'გაგრძელება Apple-ით'}
          </button>
        </>
      )}

      {!!error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
