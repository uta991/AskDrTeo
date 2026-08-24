/**
 * დრო საქართველოს დროით.
 *
 * სერვერი UTC-ზე მუშაობს და ISO სტრიქონსაც UTC-ში აბრუნებს. თუ
 * პირდაპირ ამოვჭრით, ექიმის დანიშნული 14:30 ეკრანზე 10:30-ად
 * გამოჩნდებოდა. ოფსეტი მუდმივია — ზაფხულის დრო არ მოქმედებს.
 */

export const TBILISI_TZ = 'Asia/Tbilisi';
export const TBILISI_OFFSET = '+04:00';

/** „25.08.2026, 14:30" */
export function formatTbilisi(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TBILISI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return `${get('day')}.${get('month')}.${get('year')}, ${get('hour')}:${get('minute')}`;
}

/** მხოლოდ საათი — „14:30" */
export function timeTbilisi(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TBILISI_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** „2026-08-25" — თბილისური დღე */
export function dayTbilisi(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TBILISI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}
