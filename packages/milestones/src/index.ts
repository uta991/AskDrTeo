/**
 * განვითარების მონიტორინგი — ერთადერთი წყარო.
 *
 * ⚠️ ეს არ არის დიაგნოსტიკური ტესტი და არც ვალიდირებული სკრინინგის
 * ინსტრუმენტის ასლი. AAP-ის ტერმინოლოგიით ეს `developmental
 * surveillance`-ია: მშობელი აკვირდება, სისტემა კი აჯამებს და ეუბნება,
 * ღირს თუ არა ექიმთან საუბარი. ფორმალური სკრინინგი (9, 18, 30 თვე)
 * და ASD-ის სკრინინგი (18, 24 თვე) ექიმის დანიშნულებაა.
 *
 * ვები და აპლიკაცია ორივე აქედან ითვლიან — ორი ასლი ადრე თუ გვიან
 * ერთმანეთს დაშორდებოდა და ერთი პლატფორმა სხვა დასკვნას აჩვენებდა.
 */

export type MilestoneDomain =
  | 'GROSS_MOTOR'
  | 'FINE_MOTOR'
  | 'SOCIAL_EMOTIONAL'
  | 'COGNITIVE_LANGUAGE';

export type MilestoneAnswer = 'YES' | 'SOMETIMES' | 'NOT_YET' | 'UNKNOWN';

export const DOMAIN_LABELS: Record<MilestoneDomain, string> = {
  GROSS_MOTOR: 'უხეში მოტორიკა',
  FINE_MOTOR: 'ნატიფი მოტორიკა',
  SOCIAL_EMOTIONAL: 'სოციალურ-ემოციური',
  COGNITIVE_LANGUAGE: 'კოგნიტური / მეტყველება',
};

export const DOMAIN_ORDER: MilestoneDomain[] = [
  'GROSS_MOTOR',
  'FINE_MOTOR',
  'SOCIAL_EMOTIONAL',
  'COGNITIVE_LANGUAGE',
];

export const ANSWER_LABELS: Record<MilestoneAnswer, string> = {
  YES: 'დიახ',
  SOMETIMES: 'ზოგჯერ',
  NOT_YET: 'ჯერ არა',
  UNKNOWN: 'არ ვიცი',
};

export interface Question {
  id: string;
  code: string;
  ageMonths: number;
  domain: MilestoneDomain;
  questionKa: string;
  redFlag: boolean;
}

/** დომენის მდგომარეობა — ფრთხილი ფორმულირება განზრახ. */
export type DomainStatus = 'ON_TRACK' | 'WATCH' | 'DISCUSS';

export interface DomainResult {
  domain: MilestoneDomain;
  /** მიღწეული ქულა — „დიახ" 1, „ზოგჯერ" 0.5 */
  achieved: number;
  total: number;
  ratio: number;
  status: DomainStatus;
  /** შეუსრულებელი წითელი ალმები ამ დომენში */
  redFlags: string[];
}

export interface AssessmentResult {
  ageMonths: number;
  domains: DomainResult[];
  hasRedFlag: boolean;
  /** საერთო დასკვნა — მშობლისთვის ერთი წინადადებით */
  headline: string;
  advice: string;
}

/**
 * ზღვრები.
 *
 * მკაცრი შეფასება პანიკას იწვევს, რბილი კი აზრს კარგავს. 80% ზემოთ
 * ასაკობრივ ნორმად ითვლება, 60%-მდე კი ექიმთან საუბრის საბაბია —
 * ეს დასკვნა კი არაა, არამედ მითითება, რომ ღირს გადამოწმება.
 */
/**
 * ცნობარის ბოლო ეტაპი — 6 წელი.
 *
 * ამის შემდეგ კითხვარი აღარ ჩნდება: ცხრილი 5-6 წლით სრულდება და
 * ხვრელის შევსების წესი სხვა შემთხვევაში 10 წლის ბავშვს 5 წლის
 * კითხვებს დაუბრუნებდა, რაც შედეგს უაზროს გახდიდა.
 */
export const MAX_AGE_MONTHS = 72;

const ON_TRACK_RATIO = 0.8;
const WATCH_RATIO = 0.6;

/** პასუხის ქულა — „ზოგჯერ" ნახევრად ითვლება, „არ ვიცი" საერთოდ არა. */
function score(answer: MilestoneAnswer): number | null {
  switch (answer) {
    case 'YES':
      return 1;
    case 'SOMETIMES':
      return 0.5;
    case 'NOT_YET':
      return 0;
    case 'UNKNOWN':
      // შეუვსებელი კითხვა შედეგს არ უნდა გააუარესებდეს — ჯამიდან ვაგდებთ
      return null;
  }
}

/**
 * კითხვების შერჩევა ასაკის მიხედვით.
 *
 * მხოლოდ მონიშნული ასაკის ეტაპი — 5 თვის ბავშვს 1 თვის კითხვები აღარ
 * უსვამს. ცნობარში ასაკები თანაბრად არ არის განაწილებული (16-ის შემდეგ
 * 18, 20, 22, 24, 28…), ამიტომ შუალედური ასაკი უახლოეს დაწყებულ ეტაპს
 * ეკუთვნის: 17 თვე → 16 თვის ეტაპი, 26 თვე → 24 თვის.
 */
export function questionsForAge(all: Question[], ageMonths: number): Question[] {
  if (ageMonths > MAX_AGE_MONTHS) return [];

  const stages = [...new Set(all.map((q) => q.ageMonths))].sort((a, b) => a - b);
  if (!stages.length) return [];

  // ასაკზე ნაკლები ან ტოლი ბოლო ეტაპი; თუ ბავშვი პირველ ეტაპზე პატარაა,
  // ყველაზე ადრეული ეტაპი ეძლევა — ცარიელი კითხვარი აზრს კარგავს
  const stage = stages.filter((s) => s <= ageMonths).pop() ?? stages[0];

  return all
    .filter((q) => q.ageMonths === stage)
    .sort(
      (a, b) =>
        DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain) ||
        a.code.localeCompare(b.code),
    );
}

/** მონიშნული ასაკის ეტაპი — რომელი ეტაპის კითხვები დაისმება. */
export function stageForAge(all: Question[], ageMonths: number): number | null {
  const questions = questionsForAge(all, ageMonths);
  return questions.length ? questions[0].ageMonths : null;
}

/** დომენის შედეგი პასუხების მიხედვით. */
function evaluateDomain(
  domain: MilestoneDomain,
  questions: Question[],
  answers: Record<string, MilestoneAnswer>,
): DomainResult {
  let achieved = 0;
  let total = 0;
  const redFlags: string[] = [];

  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) continue;

    const value = score(answer);
    if (value === null) continue;

    achieved += value;
    total += 1;

    if (question.redFlag && answer === 'NOT_YET') {
      redFlags.push(question.questionKa);
    }
  }

  const ratio = total === 0 ? 1 : achieved / total;

  // წითელი ალამი ზღვრებზე მაღლა დგას — ერთიც კი საკმარისია
  const status: DomainStatus = redFlags.length
    ? 'DISCUSS'
    : ratio >= ON_TRACK_RATIO
      ? 'ON_TRACK'
      : ratio >= WATCH_RATIO
        ? 'WATCH'
        : 'DISCUSS';

  return { domain, achieved: round(achieved), total, ratio: round(ratio, 2), status, redFlags };
}

export function evaluate(
  questions: Question[],
  answers: Record<string, MilestoneAnswer>,
  ageMonths: number,
): AssessmentResult {
  const domains = DOMAIN_ORDER.map((domain) =>
    evaluateDomain(
      domain,
      questions.filter((q) => q.domain === domain),
      answers,
    ),
  ).filter((result) => result.total > 0);

  const hasRedFlag = domains.some((d) => d.redFlags.length > 0);
  const needsDiscussion = domains.filter((d) => d.status === 'DISCUSS');
  const watching = domains.filter((d) => d.status === 'WATCH');

  let headline: string;
  let advice: string;

  if (hasRedFlag) {
    headline = 'ღირს ექიმთან საუბარი';
    advice =
      'ზოგიერთი უნარი, რომელიც ამ ასაკში მოსალოდნელია, ჯერ არ გამოვლენილა. ' +
      'ეს არ ნიშნავს დიაგნოზს — მიმართეთ პედიატრს გადასამოწმებლად.';
  } else if (needsDiscussion.length) {
    headline = 'რამდენიმე მიმართულება ყურადღებას საჭიროებს';
    advice =
      `${needsDiscussion.map((d) => DOMAIN_LABELS[d.domain]).join(', ')} — ` +
      'ამ მიმართულებაზე ღირს ექიმთან საუბარი მომდევნო ვიზიტზე.';
  } else if (watching.length) {
    headline = 'განვითარება ასაკის ფარგლებშია';
    advice =
      `${watching.map((d) => DOMAIN_LABELS[d.domain]).join(', ')} — ` +
      'ამ მიმართულებას თვალი ადევნეთ და ერთ თვეში ხელახლა შეავსეთ.';
  } else {
    headline = 'განვითარება ასაკის შესაბამისია';
    advice = 'გააგრძელეთ დაკვირვება და შეავსეთ კითხვარი მომდევნო ასაკობრივ ეტაპზე.';
  }

  return { ageMonths, domains, hasRedFlag, headline, advice };
}

export const STATUS_LABELS: Record<DomainStatus, string> = {
  ON_TRACK: 'ასაკის შესაბამისი',
  WATCH: 'დაკვირვება',
  DISCUSS: 'ექიმთან საუბარი',
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
