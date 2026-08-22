'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface VaccinationRow {
  vaccineId: string;
  code: string;
  name: string;
  description: string | null;
  ageMonths: number;
  doseNumber: number;
  dueAt: string;
  daysLeft: number;
  status: 'DONE' | 'DUE' | 'SOON' | 'UPCOMING';
  doneAt: string | null;
  note: string | null;
}

export interface VaccinationState {
  error?: string;
}

/** მონიშვნა: თარიღით — გაკეთდა, ცარიელით — მონიშვნა იხსნება. */
export async function markVaccination(
  childId: string,
  vaccineId: string,
  doneAt: string | null,
): Promise<VaccinationState> {
  try {
    await apiMutate(`/children/${childId}/vaccinations/${vaccineId}`, 'PATCH', {
      doneAt: doneAt ? new Date(doneAt).toISOString() : undefined,
    });

    revalidatePath('/vaccinations');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა' };
  }
}
