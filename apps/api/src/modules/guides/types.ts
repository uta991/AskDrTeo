/**
 * მშობლის გზამკვლევები — მოგზაურობა, კვება, ძილი.
 *
 * სამივეს ერთი ფორმა აქვს: შესავალი, ბარათები და ვიდეოთეკის კატეგორია.
 * მოგზაურობას დამატებით ჩეკლისტი და აცრების სია აქვს. ერთი ფორმის
 * წყალობით გვერდი ერთხელ იწერება და სამივეს ემსახურება.
 *
 * ტექსტი კოდშია და არა ბაზაში: ის ყველა ოჯახისთვის ერთია და ასე
 * ცვლილებების ისტორია git-ში რჩება.
 *
 * ყველა გზამკვლევი ზოგადი მომზადებისთვისაა — პედიატრის კონსულტაციას
 * ვერ ცვლის და კონკრეტულ მკურნალობას არ ნიშნავს.
 */

export interface GuideCard {
  key: string;
  title: string;
  /** ასაკი ან სხვა მოკლე მინიშნება სათაურის გვერდით */
  meta?: string;
  body: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  /** განმარტება — მხოლოდ იქ, სადაც მარტო სათაური ბუნდოვანია */
  hint?: string;
}

export interface ChecklistGroup {
  key: string;
  title: string;
  items: ChecklistItem[];
}

export interface TravelVaccine {
  key: string;
  name: string;
  note: string;
}

export interface Guide {
  slug: string;
  title: string;
  intro: string;
  cards: GuideCard[];
  checklist?: ChecklistGroup[];
  vaccines?: TravelVaccine[];
  /** ვიდეოთეკის კატეგორია, სადაც ამ თემის ვიდეოებია */
  videoCategorySlug: string;
  /**
   * პაკეტის გარეშე ხელმისაწვდომი.
   *
   * სასწრაფო დახმარების ინფორმაცია ფასიანი ვერ იქნება — ის მაშინ
   * სჭირდება მშობელს, როცა პაკეტზე ფიქრის დრო არ აქვს.
   */
  free?: boolean;
}

export const DISCLAIMER =
  'ეს ზოგადი რჩევებია და ექიმის კონსულტაციას ვერ ცვლის. '
  + 'ბავშვის მდგომარეობაზე ეჭვის შემთხვევაში დაუკავშირდით პედიატრს.';
