'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface MedicationState {
  error?: string;
  notice?: string;
}

/** `1|სიროფი 120 მგ / 5 მლ|120|5` სტილის სტრიქონები — ერთი ველი, რამდენიმე ჩანაწერი. */
function parseRows<T>(raw: string, build: (parts: string[]) => T | null): T[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => build(line.split('|').map((p) => p.trim())))
    .filter((row): row is T => row !== null);
}

export async function saveMedication(
  _prev: MedicationState,
  formData: FormData,
): Promise<MedicationState> {
  const id = String(formData.get('id') ?? '').trim();
  const dosingType = String(formData.get('dosingType') ?? 'PER_KG');

  const num = (name: string): number | undefined => {
    const raw = String(formData.get(name) ?? '').trim().replace(',', '.');
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const concentrations = parseRows(String(formData.get('concentrations') ?? ''), (parts) => {
    const [label, mg, ml] = parts;
    if (!label || !mg || !ml) return null;
    return { label, mg: Number(mg.replace(',', '.')), ml: Number(ml.replace(',', '.')) };
  });

  if (!concentrations.length) {
    return { error: 'მიუთითეთ მინიმუმ ერთი კონცენტრაცია: აღწერა | მგ | მლ' };
  }

  const body: Record<string, unknown> = {
    name: String(formData.get('name') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim().toLowerCase(),
    dosingType,
    intervalHoursMin: num('intervalHoursMin'),
    intervalHoursMax: num('intervalHoursMax'),
    maxDailyMg: num('maxDailyMg'),
    minAgeMonths: num('minAgeMonths') ?? 0,
    minWeightKg: num('minWeightKg') ?? 0,
    concentrations,
    note: String(formData.get('note') ?? '').trim() || undefined,
    sortOrder: num('sortOrder') ?? 0,
  };

  if (dosingType === 'PER_KG') {
    body.mgPerKgMin = num('mgPerKgMin');
    body.mgPerKgMax = num('mgPerKgMax') ?? num('mgPerKgMin');
  } else {
    body.ageBands = parseRows(String(formData.get('ageBands') ?? ''), (parts) => {
      const [label, untilMonths, mg] = parts;
      if (!label || !untilMonths || !mg) return null;
      return { label, untilMonths: Number(untilMonths), mg: Number(mg.replace(',', '.')) };
    });

    if (!(body.ageBands as unknown[]).length) {
      return { error: 'ასაკობრივ დოზირებას სჭირდება საფეხურები: აღწერა | თვემდე | მგ' };
    }
  }

  try {
    if (id) await apiMutate(`/admin/medications/${id}`, 'PATCH', body);
    else await apiMutate('/admin/medications', 'POST', body);

    revalidatePath('/admin/medications');
    revalidatePath('/calculator');
    return { notice: id ? 'წამალი განახლდა' : 'წამალი დაემატა' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა' };
  }
}

/** წაშლა რბილია — კალკულატორიდან ქრება, ისტორია რჩება. */
export async function deleteMedication(
  _prev: MedicationState,
  formData: FormData,
): Promise<MedicationState> {
  const id = String(formData.get('id') ?? '');

  try {
    await apiMutate(`/admin/medications/${id}`, 'DELETE');
    revalidatePath('/admin/medications');
    revalidatePath('/calculator');
    return { notice: 'წამალი წაშლილია' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'წაშლა ვერ მოხერხდა' };
  }
}
