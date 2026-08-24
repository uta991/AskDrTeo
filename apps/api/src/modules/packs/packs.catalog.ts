/**
 * კონსულტაციის პაკეტები.
 *
 * ესენი გამოწერა არ არის და მას არ ცვლის — ცალკე ნაყიდი ლიმიტია,
 * რომელსაც მშობელი მაშინ იღებს, როცა თვის უფასო ვიზიტი ამოწურა.
 * ამიტომ ისინი ბაზის Plan-ებში არ ცხოვრობენ: Plan-ის ყიდვა ძველ
 * გამოწერას აუქმებს, პაკეტი კი მას ხელს არ უნდა ახლებდეს.
 */

export interface ConsultationPackOffer {
  code: string;
  name: string;
  /** რამდენი საუბარი შედის */
  chats: number;
  /** რამდენ ხანს მოქმედებს */
  days: number;
  /** ფასი ცენტებში */
  amountMinor: number;
  currency: 'USD';
  /** ვადის ადამიანური აღწერა */
  periodLabel: string;
  description: string;
  highlight?: boolean;
}

export const PACKS: ConsultationPackOffer[] = [
  {
    code: 'day5',
    name: 'დღიური',
    chats: 5,
    days: 1,
    amountMinor: 500,
    currency: 'USD',
    periodLabel: '24 საათი',
    description: '5 საუბარი ექიმთან ერთი დღე-ღამის განმავლობაში',
  },
  {
    code: 'week40',
    name: 'კვირეული',
    chats: 40,
    days: 7,
    amountMinor: 3500,
    currency: 'USD',
    periodLabel: '7 დღე',
    description: '40 შეკითხვა კვირის განმავლობაში',
    highlight: true,
  },
  {
    code: 'month100',
    name: 'პრემიუმი',
    chats: 100,
    days: 30,
    amountMinor: 9000,
    currency: 'USD',
    periodLabel: '30 დღე',
    description: '100 საუბარი თვის განმავლობაში',
  },
];

export function findPack(code: string): ConsultationPackOffer | undefined {
  return PACKS.find((pack) => pack.code === code);
}
