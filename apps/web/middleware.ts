import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

const ACCESS_COOKIE = 'adt_access';
const REFRESH_COOKIE = 'adt_refresh';

/** access ტოკენის ვადა 15 წუთია — cookie-საც იმავე ვადით ვწერთ. */
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * სესიის გაგრძელება.
 *
 * access ტოკენი 15 წუთში იწურება. მშობელი კითხვარს ან ჩატს უფრო დიდხანს
 * ავსებს და შუა გზაზე „სესია ამოიწურა" ხვდებოდა. აქ refresh ტოკენით
 * ჩუმად ვანახლებთ — ხელახლა შესვლა მხოლოდ 30 დღის უმოქმედობის შემდეგ
 * დასჭირდება.
 *
 * middleware-ში ხდება იმიტომ, რომ Server Component-ს რენდერისას cookie-ს
 * დაწერა არ შეუძლია.
 */
export async function middleware(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  // access ჯერ ცოცხალია ან refresh საერთოდ არ გვაქვს — ჩარევა ზედმეტია
  if (access || !refresh) return NextResponse.next();

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: 'no-store',
    });

    if (!res.ok) {
      // refresh აღარ ვარგა — ძველ cookie-ს ვშლით, თორემ ყოველ გვერდზე ვცდით
      const response = NextResponse.next();
      response.cookies.delete(REFRESH_COOKIE);
      return response;
    }

    const tokens = (await res.json()) as { accessToken: string; refreshToken: string };

    // ახალი ტოკენი ამ მოთხოვნასაც უნდა მოხმარდეს და პასუხშიც ჩაიწეროს
    const headers = new Headers(request.headers);
    const cookie = request.headers.get('cookie') ?? '';
    headers.set(
      'cookie',
      `${cookie ? `${cookie}; ` : ''}${ACCESS_COOKIE}=${tokens.accessToken}`,
    );

    const response = NextResponse.next({ request: { headers } });
    const secure = process.env.NODE_ENV === 'production';

    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_MAX_AGE,
    });

    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });

    return response;
  } catch {
    // API მიუწვდომელია — გვერდი მაინც უნდა გაიხსნას
    return NextResponse.next();
  }
}

export const config = {
  // სტატიკა და სურათები გამორიცხულია — მათზე სესია არ მოქმედებს
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|images).*)'],
};
