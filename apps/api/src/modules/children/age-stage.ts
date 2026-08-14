/**
 * ბავშვის ასაკობრივი ეტაპები.
 *
 * თითოეულ ეტაპს მკვეთრად განსხვავებული საჭიროებები აქვს — აპლიკაცია ამის
 * მიხედვით არჩევს, რა უჩვენოს მშობელს.
 *
 * სასკოლო ასაკი ორადაა გაყოფილი: 6–12 და 12–18. მოზარდობის თემები
 * (ჰორმონული ცვლილებები, ფსიქოლოგიური საკითხები) იმდენად განსხვავდება
 * დაწყებითი კლასების საკითხებისგან, რომ ერთ ეტაპად მოქცევა კონტენტს
 * გამოუსადეგარს გახდიდა.
 *
 * ტექსტები აქ არ ინახება — მხოლოდ key-ები. აღწერები მობილურის
 * თარგმანებშია, რომ სამივე ენაზე მუშაობდეს.
 */

export type AgeStageKey =
  | 'NEWBORN'
  | 'INFANT'
  | 'TODDLER'
  | 'PRESCHOOL'
  | 'SCHOOL'
  | 'TEEN';

interface StageRange {
  key: AgeStageKey;
  /** ჩათვლით */
  minMonths: number;
  /** არ ითვლება — შემდეგი ეტაპის დასაწყისია */
  maxMonths: number;
}

export const AGE_STAGES: StageRange[] = [
  { key: 'NEWBORN', minMonths: 0, maxMonths: 1 },
  { key: 'INFANT', minMonths: 1, maxMonths: 12 },
  { key: 'TODDLER', minMonths: 12, maxMonths: 36 },
  { key: 'PRESCHOOL', minMonths: 36, maxMonths: 72 },
  { key: 'SCHOOL', minMonths: 72, maxMonths: 144 },
  { key: 'TEEN', minMonths: 144, maxMonths: Number.POSITIVE_INFINITY },
];

export function resolveAgeStage(ageMonths: number): AgeStageKey {
  const stage = AGE_STAGES.find(
    (s) => ageMonths >= s.minMonths && ageMonths < s.maxMonths,
  );
  // 18 წელს გადაცილებულიც TEEN-ად რჩება — ზედა ზღვარი აპლიკაციას არ ესაჭიროება
  return stage?.key ?? 'TEEN';
}

/**
 * ნაადრევად დაბადებულის კორექტირებული ასაკი.
 *
 * 37 კვირამდე დაბადებულ ბავშვს განვითარების ეტაპებს კორექტირებული ასაკით
 * აფასებენ — კალენდარული ასაკით შეფასება ცრუ შეშფოთებას იწვევს.
 * კორექცია 24 თვემდე გამოიყენება.
 */
export function correctedAgeMonths(
  ageMonths: number,
  gestationalWeek: number | null,
): number {
  if (!gestationalWeek || gestationalWeek >= 37 || ageMonths >= 24) {
    return ageMonths;
  }

  const weeksEarly = 37 - gestationalWeek;
  return Math.max(0, ageMonths - Math.round(weeksEarly / 4.345));
}
