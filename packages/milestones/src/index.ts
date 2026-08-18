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
 * წინა თვეების კითხვებიც შედის: 8 თვის ბავშვს 6 თვის უნარებიც უნდა
 * ჰქონდეს. `windowMonths` ზღუდავს რამდენად შორს ვიხედებით უკან —
 * თორემ 5 წლის ბავშვს ასობით კითხვა დაუგროვდებოდა.
 */
export function questionsForAge(
  all: Question[],
  ageMonths: number,
  windowMonths = 6,
): Question[] {
  const eligible = all.filter((q) => q.ageMonths <= ageMonths);
  if (!eligible.length) return [];

  let lowerBound = Math.max(0, ageMonths - windowMonths);

  // ცნობარში ასაკები თანაბრად არ არის განაწილებული — თუ ფანჯარაში
  // ვერაფერი მოხვდა, უახლოეს წინა ეტაპამდე ვწევთ. სხვაგვარად ბავშვს,
  // რომლის ასაკზეც ჯერ კითხვები არაა, ცარიელი კითხვარი დახვდებოდა.
  if (!eligible.some((q) => q.ageMonths >= lowerBound)) {
    lowerBound = Math.max(...eligible.map((q) => q.ageMonths));
  }

  return eligible
    .filter((q) => q.ageMonths >= lowerBound)
    .sort(
      (a, b) =>
        DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain) ||
        a.ageMonths - b.ageMonths ||
        a.code.localeCompare(b.code),
    );
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
