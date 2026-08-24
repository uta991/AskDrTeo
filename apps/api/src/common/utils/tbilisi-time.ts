/**
 * დრო საქართველოს დროით.
 *
 * სერვერი UTC-ზე მუშაობს, ექიმი და მშობელი კი თბილისის საათს
 * უყურებენ. თუ გარდაქმნას არ გავაკეთებთ, ადმინის მიერ დანიშნული
 * 14:30 SMS-ში 10:30-ად ჩავიდოდა.
 *
 * ოფსეტი მუდმივია — საქართველოში ზაფხულის დრო არ მოქმედებს.
 */

export const TBILISI_TZ = 'Asia/Tbilisi';
export const TBILISI_OFFSET = '+04:00';

/** „2026-08-25" — დღე თბილისის კალენდრით. */
export function tbilisiDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TBILISI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** თბილისური დღის დასაწყისი — შენახვისა და დაჯგუფებისთვის. */
export function tbilisiStartOfDay(date: Date): Date {
  return new Date(`${tbilisiDayKey(date)}T00:00:00${TBILISI_OFFSET}`);
}

/** დღეების მიმატება. ზაფხულის დროის გარეშე ეს უბრალო არითმეტიკაა. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** „25.08.2026, 14:30" — თბილისის დროით, SMS-შიც და შეტყობინებაშიც. */
export function formatTbilisi(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TBILISI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return `${get('day')}.${get('month')}.${get('year')}, ${get('hour')}:${get('minute')}`;
}
