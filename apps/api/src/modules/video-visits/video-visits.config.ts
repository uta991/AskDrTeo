/**
 * ვიდეო ვიზიტის წესები.
 *
 * ერთჯერადი შეხვედრაა და პაკეტში არ შედის — ამიტომ ფასი და დღიური
 * ტევადობა აქ ერთ ადგილასაა და ბაზაში არ იშლება.
 */

/** ერთი ვიზიტის ფასი ცენტებში. */
export const VISIT_PRICE_MINOR = 3900;
export const VISIT_CURRENCY = 'USD';

/** დღეში რამდენი ვიდეო ვიზიტი დაიშვება. */
export const DAILY_CAPACITY = 5;

/** რამდენი წუთით ადრე ვთხოვთ მშობელს მზადყოფნას. */
export const BE_READY_MINUTES = 5;

/**
 * რამდენი წუთით ადრე იხსნება ჩართვის ღილაკი.
 *
 * ოთახი მუდმივად ღია რომ იყოს, მშობელი ნებისმიერ დროს შევიდოდა და
 * ექიმს ცარიელ ოთახში ელოდებოდა. ჩართვა დანიშნულ საათს უნდა
 * უკავშირდებოდეს.
 */
export const JOIN_OPENS_MINUTES = 10;

/** რამდენ ხანს რჩება ოთახი ღია დანიშნული დროის შემდეგ. */
export const JOIN_CLOSES_MINUTES = 120;

/** რამდენ დღეზე ადრე შეიძლება დღის არჩევა. */
export const BOOKING_HORIZON_DAYS = 30;

/**
 * Agora-ს წვდომა ერთი ვიზიტისთვის.
 *
 * ინტერფეისი ჩვენია — Agora მხოლოდ არხს იძლევა. App Certificate
 * მხოლოდ სერვერზეა და კლიენტს არასდროს გადაეცემა: მას მოკლევადიანი
 * ტოკენი ხვდება, რომელიც ერთ არხსა და ერთ მონაწილეზეა გამოშვებული.
 */
export interface AgoraAccess {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  expiresAt: Date;
}

/**
 * მონაწილის ნომერი არხში.
 *
 * ორივე მხარეს ფიქსირებული ნომერი აქვს — ასე კლიენტი წინასწარ იცის,
 * რომელი ვიდეო ვისია და ხელახლა შემოსვლისას დუბლიკატი არ ჩნდება.
 */
export const PARENT_UID = 1;
export const STAFF_UID = 2;

/** ტოკენის მოქმედების ვადა — ვიზიტის ფანჯარაზე ოდნავ გრძელი. */
export const TOKEN_TTL_SECONDS = (JOIN_OPENS_MINUTES + JOIN_CLOSES_MINUTES + 30) * 60;

export function agoraConfigured(): boolean {
  return Boolean(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE);
}
