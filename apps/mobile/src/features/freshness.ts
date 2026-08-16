/**
 * რამდენ ხანს ითვლება ჩატვირთული მონაცემი ახლად.
 *
 * ეკრანებს შორის გადაფურცვლა კომპონენტს ხელახლა ამონტაჟებს და ყოველ
 * ჯერზე მოთხოვნა მიდიოდა — სიები თვალსაჩინოდ ციმციმებდა. ამ ვადაში
 * განმეორებითი გამოძახება იგნორირდება; `force`-ით ყოველთვის იტვირთება.
 */
export const STALE_AFTER_MS = 5 * 60 * 1000;

export function isFresh(timestamp: number | undefined): boolean {
  return !!timestamp && Date.now() - timestamp < STALE_AFTER_MS;
}
