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

/** რამდენ დღეზე ადრე შეიძლება დღის არჩევა. */
export const BOOKING_HORIZON_DAYS = 30;

/**
 * ვიდეო ოთახის მისამართი.
 *
 * ცალკე ანგარიშსა და გასაღებს არ ითხოვს — ოთახის სახელი შემთხვევითია
 * და მისამართის გამოცნობა შეუძლებელია. მოგვიანებით სხვა სერვისზე
 * გადასვლას მხოლოდ ეს ერთი ფუნქცია დასჭირდება.
 */
export function roomUrl(roomName: string, displayName: string): string {
  const base = process.env.VIDEO_ROOM_BASE ?? 'https://meet.jit.si';
  const params = new URLSearchParams({ 'userInfo.displayName': displayName });

  return `${base}/${roomName}#${params.toString()}`;
}
