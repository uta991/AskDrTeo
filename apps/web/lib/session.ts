import { cookies } from 'next/headers';

export const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

const ACCESS_COOKIE = 'adt_access';
const REFRESH_COOKIE = 'adt_refresh';

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: 'PARENT' | 'OPERATOR' | 'ADMIN' | 'SUPER_ADMIN';
}

/**
 * ტოკენები httpOnly cookie-ში.
 *
 * `localStorage` განზრახ არ გამოიყენება: მას ნებისმიერი სკრიპტი
 * კითხულობს, ანუ ერთი XSS ადმინის სესიას გაიტაცებდა. httpOnly
 * cookie-ს JavaScript ვერ ხედავს.
 */
export async function saveSession(accessToken: string, refreshToken: string): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === 'production';

  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });

  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

/**
 * მიმდინარე მომხმარებელი.
 *
 * access token-ის ვადა 15 წუთია; ამოწურვისას `null` ბრუნდება და
 * მომხმარებელი login-ზე გადადის. refresh-ს ვებზე განზრახ არ ვაკეთებთ
 * ავტომატურად — ადმინის სესია ხანმოკლე უნდა იყოს.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return (await res.json()) as SessionUser;
  } catch {
    return null;
  }
}

/** API-ს გამოძახება სესიის ტოკენით — სერვერის მხარეს. */
export async function apiFetch<T>(path: string): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
