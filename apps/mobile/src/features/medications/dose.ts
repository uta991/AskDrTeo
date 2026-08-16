import type { Concentration, Medication } from './medications.store';

/**
 * დოზის გამოთვლა.
 *
 * ⚠️ ეს ლოგიკა ვებზეც არსებობს — `apps/web/lib/medications.ts`. ორივე
 * ერთი და იგივე ფორმულას ასრულებს და ერთმანეთს უნდა ემთხვეოდეს:
 * ერთში შეცვლისას მეორეც აუცილებლად შეასწორე, თორემ ერთი პლატფორმა
 * სხვა დოზას აჩვენებდა.
 */
export interface DoseResult {
  singleMgMin: number;
  singleMgMax: number;
  singleMlMin?: number;
  singleMlMax?: number;
  dailyMaxMg: number;
  dosesPerDay: number;
  cappedBySingleLimit: boolean;
  bandLabel?: string;
  warnings: string[];
}

export function calculateDose(
  medication: Medication,
  weightKg: number,
  ageMonths: number,
  concentration?: Concentration,
): DoseResult | { blocked: string } {
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
