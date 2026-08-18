/**
 * პედიატრიული დოზების გამოთვლა — ერთადერთი წყარო.
 *
 * ვები და აპლიკაცია ორივე აქედან ითვლიან. ადრე ლოგიკა ორ ადგილას ეწერა
 * და ერთში შესწორება მეორეს არ ეხებოდა — ორი პლატფორმა სხვადასხვა
 * დოზას აჩვენებდა. დოზირებაზე ეს დაუშვებელია, ამიტომ კოდი ცალკე
 * პაკეტშია და დუბლირება ფიზიკურად შეუძლებელია.
 *
 * თავად ცნობარი (რომელი წამალი, რა დოზა) ბაზაშია და ექიმი რედაქტირებს —
 * აქ მხოლოდ ფორმულა და უსაფრთხოების ზღვრებია.
 */

export interface Concentration {
  /** როგორ წერია შეფუთვაზე — მომხმარებელი ასე ცნობს */
  label: string;
  mg: number;
  ml: number;
}

/** ასაკობრივი საფეხური — `untilMonths` ამ ზღვრამდე (არაჩათვლით) მოქმედებს. */
export interface AgeBand {
  untilMonths: number;
  mg: number;
  label: string;
}

export interface Medication {
  id: string;
  slug: string;
  name: string;
  dosingType: 'PER_KG' | 'BY_AGE';
  mgPerKgMin: number | null;
  mgPerKgMax: number | null;
  ageBands: AgeBand[] | null;
  /** მიღებებს შორის ინტერვალი საათებში */
  intervalHoursMin: number;
  intervalHoursMax: number;
  /** მაქსიმალური თერაპიული დოზა 24 საათში, მგ */
  maxDailyMg: number;
  /** ამ ასაკამდე საერთოდ არ ითვლება */
  minAgeMonths: number;
  /** ამ წონაზე ნაკლებზე დოზა არ გამოითვლება — ინდივიდუალური დანიშვნაა */
  minWeightKg: number;
  concentrations: Concentration[];
  isActive?: boolean;
  sortOrder?: number;
  /** ეკრანზე გამოსატანი განმარტება */
  note?: string | null;
}

export interface DoseResult {
  singleMgMin: number;
  singleMgMax: number;
  singleMlMin?: number;
  singleMlMax?: number;
  dailyMaxMg: number;
  /** რამდენჯერ შეიძლება მიღება 24 საათში */
  dosesPerDay: number;
  /** ლიმიტმა შეზღუდა თუ არა ერთჯერადი დოზა */
  cappedBySingleLimit: boolean;
  /** ასაკობრივი საფეხური, თუ დოზა ასეა განსაზღვრული */
  bandLabel?: string;
  warnings: string[];
}

export interface DoseBlocked {
  blocked: string;
}

/**
 * დოზის გამოთვლა.
 *
 * თანმიმდევრობა მნიშვნელოვანია: ჯერ ასაკი და წონა იბლოკება, მერე დოზა
 * ითვლება და ბოლოს დღიური ლიმიტით იჭრება — ასე გამოთვლილი რიცხვი
 * ვერასდროს გასცდება თერაპიულ ზღვარს.
 *
 * ფორმულა: წონა × მგ/კგ × მლ ÷ მგ
 */
export function calculateDose(
  medication: Medication,
  weightKg: number,
  ageMonths: number,
  concentration?: Concentration,
): DoseResult | DoseBlocked {
  if (ageMonths < medication.minAgeMonths) {
    return {
      blocked: `${medication.name} ${medication.minAgeMonths} თვემდე არ გამოიყენება — მიმართეთ პედიატრს.`,
    };
  }

  // წონის ქვედა ზღვარი — ასეთ პატარებზე დოზა ინდივიდუალურად ინიშნება
  if (weightKg < medication.minWeightKg) {
    return { blocked: 'მიმართეთ პედიატრს ინდივიდუალური დოზირებისთვის.' };
  }

  const warnings: string[] = [];

  // მიღებების რაოდენობა უფრო იშვიათი ინტერვალით — ასე დღიური ჯამი
  // ვერ გადააჭარბებს ლიმიტს
  const dosesPerDay = Math.max(1, Math.floor(24 / medication.intervalHoursMax));
  const maxSingleMg = medication.maxDailyMg / dosesPerDay;

  let bandLabel: string | undefined;
  let raw: { min: number; max: number };

  if (medication.dosingType === 'PER_KG') {
    raw = {
      min: weightKg * (medication.mgPerKgMin ?? 0),
      max: weightKg * (medication.mgPerKgMax ?? 0),
    };
  } else {
    const band = (medication.ageBands ?? []).find((b) => ageMonths < b.untilMonths);
    if (!band) return { blocked: 'ასაკი ცნობარის დიაპაზონს სცდება — მიმართეთ ექიმს.' };

    raw = { min: band.mg, max: band.mg };
    bandLabel = band.label;
  }

  const singleMgMin = Math.min(raw.min, maxSingleMg);
  const singleMgMax = Math.min(raw.max, maxSingleMg);
  const cappedBySingleLimit = raw.max > maxSingleMg;

  if (cappedBySingleLimit) {
    warnings.push(
      `გამოთვლილი დოზა თერაპიულ ზღვარს აჭარბებდა — შემცირებულია ${round(maxSingleMg)} მგ-მდე.`,
    );
  }

  const result: DoseResult = {
    singleMgMin: round(singleMgMin),
    singleMgMax: round(singleMgMax),
    dailyMaxMg: medication.maxDailyMg,
    dosesPerDay,
    cappedBySingleLimit,
    bandLabel,
    warnings,
  };

  if (concentration) {
    const toMl = (mg: number) => round((mg * concentration.ml) / concentration.mg, 2);
    result.singleMlMin = toMl(singleMgMin);
    result.singleMlMax = toMl(singleMgMax);
  }

  return result;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
