'use server';

import { redirect } from 'next/navigation';
import { API_URL, clearSession, getSessionUser, saveSession } from '@/lib/session';

export interface LoginState {
  error?: string;
}

/**
 * შესვლა.
 *
 * Server Action-ია, რომ პაროლი ბრაუზერის JS-ს არ გაუაროს და ტოკენები
 * პირდაპირ httpOnly cookie-ში ჩაჯდეს.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!identifier || !password) {
    return { error: 'შეავსეთ ორივე ველი' };
  }

  let payload: { tokens?: { accessToken: string; refreshToken: string }; message?: string };

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
      cache: 'no-store',
    });
    payload = await res.json();

    if (!res.ok) {
      return { error: payload.message ?? 'შესვლა ვერ მოხერხდა' };
    }
  } catch {
    return { error: 'სერვერთან კავშირი ვერ დამყარდა' };
  }

  if (!payload.tokens) return { error: 'სერვერმა ტოკენი არ დააბრუნა' };

  await saveSession(payload.tokens.accessToken, payload.tokens.refreshToken);

  // როლი განსაზღვრავს სად მიდის: პერსონალი პანელში, მშობელი — თავის
  // კაბინეტში. ორივეს ერთ ადგილას გაგზავნა ერთს ჩიხში ტოვებდა.
  const user = await getSessionUser();
  redirect(user && user.role !== 'PARENT' ? '/admin' : '/account');
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect('/login');
}
