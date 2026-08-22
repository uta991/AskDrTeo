'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface GrowthPoint {
  id: string;
  measuredAt: string;
  ageMonths: number;
  weightKg: number | null;
  heightCm: number | null;
  headCm: number | null;
  note: string | null;
}

export interface GrowthState {
  error?: string;
}

/** ახალი გაზომვა — ცარიელი ველი უბრალოდ არ იგზავნება. */
export async function addEntry(childId: string, formData: FormData): Promise<GrowthState> {
  const number = (name: string): number | undefined => {
    const raw = String(formData.get(name) ?? '').trim();
    return raw ? Number(raw.replace(',', '.')) : undefined;
  };

  const measuredAt = String(formData.get('measuredAt') ?? '').trim();
  if (!measuredAt) return { error: 'მიუთითეთ თარიღი' };

  const weightKg = number('weightKg');
  const heightCm = number('heightCm');
  const headCm = number('headCm');

  if (!weightKg && !heightCm && !headCm) {
    return { error: 'შეიყვანეთ ერთი მაინც: წონა, სიმაღლე ან თავის გარშემოწერილობა' };
  }

  try {
    await apiMutate(`/children/${childId}/growth`, 'POST', {
      measuredAt: new Date(measuredAt).toISOString(),
      weightKg,
      heightCm,
      headCm,
    });

    revalidatePath('/growth');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა' };
  }
}

export async function removeEntry(childId: string, entryId: string): Promise<GrowthState> {
  try {
    await apiMutate(`/children/${childId}/growth/${entryId}`, 'DELETE');
    revalidatePath('/growth');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'წაშლა ვერ მოხერხდა' };
  }
}
