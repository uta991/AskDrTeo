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


export interface RegisterState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * რეგისტრაცია.
 *
 * ტოკენებს აქ არ ვინახავთ — ანგარიში ჯერ დაუდასტურებელია. SMS კოდის
 * შეყვანის შემდეგ ხდება შესვლა.
 */
export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phoneDigits = String(formData.get('phone') ?? '').replace(/\D/g, '');
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  const acceptedTerms = formData.get('acceptedTerms') === 'on';

  const fieldErrors: Record<string, string> = {};
  if (!firstName) fieldErrors.firstName = 'შეიყვანეთ სახელი';
  if (!lastName) fieldErrors.lastName = 'შეიყვანეთ გვარი';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fieldErrors.email = 'ელ. ფოსტა არასწორია';
  if (phoneDigits.length < 9) fieldErrors.phone = 'ტელეფონის ნომერი არასრულია';
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    fieldErrors.password = 'მინიმუმ 8 სიმბოლო, ასო და ციფრი';
  }
  if (password !== confirmPassword) fieldErrors.confirmPassword = 'პაროლები არ ემთხვევა';
  if (!acceptedTerms) fieldErrors.acceptedTerms = 'დაეთანხმეთ წესებსა და პირობებს';

  if (Object.keys(fieldErrors).length) return { fieldErrors };

  let redirectTo: string;

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: `+995${phoneDigits.replace(/^995/, '')}`,
        password,
        acceptedTerms,
      }),
      cache: 'no-store',
    });

    const payload = await res.json();
    if (!res.ok) {
      const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
      return { error: message ?? 'რეგისტრაცია ვერ მოხერხდა' };
    }

    // SMS არხის გარეშე სერვერი ანგარიშს მაშინვე ხსნის და ტოკენებს აბრუნებს.
    if (payload.tokens) {
      await saveSession(payload.tokens.accessToken, payload.tokens.refreshToken);
      redirectTo = '/account';
    } else {
      redirectTo = `/verify?destination=${encodeURIComponent(payload.destination)}`;
    }
  } catch {
    return { error: 'სერვერთან კავშირი ვერ დამყარდა' };
  }

  redirect(redirectTo);
}

export interface VerifyState {
  error?: string;
}

/** SMS კოდის დადასტურება — წარმატებისას მაშინვე შედის. */
export async function verifyOtp(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const destination = String(formData.get('destination') ?? '');
  const code = String(formData.get('code') ?? '').replace(/\D/g, '');

  if (code.length < 6) return { error: 'შეიყვანეთ სრული კოდი' };

  let tokens: { accessToken: string; refreshToken: string } | undefined;

  try {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, code, purpose: 'PHONE_VERIFICATION' }),
      cache: 'no-store',
    });

    const payload = await res.json();
    if (!res.ok) {
      const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
      return { error: message ?? 'კოდი არასწორია' };
    }

    tokens = payload.tokens;
  } catch {
    return { error: 'სერვერთან კავშირი ვერ დამყარდა' };
  }

  if (!tokens) return { error: 'სერვერმა ტოკენი არ დააბრუნა' };

  await saveSession(tokens.accessToken, tokens.refreshToken);
  redirect('/account');
}

/** კოდის ხელახლა გაგზავნა. */
export async function resendOtp(destination: string): Promise<void> {
  await fetch(`${API_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination, purpose: 'PHONE_VERIFICATION' }),
    cache: 'no-store',
  }).catch(() => undefined);
}
