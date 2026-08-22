'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface Vaccine {
  id: string;
  code: string;
  name: string;
  description: string | null;
  ageMonths: number;
  doseNumber: number;
  isActive: boolean;
}

export interface VaccineState {
  error?: string;
  notice?: string;
}

export async function addVaccine(_prev: VaccineState, formData: FormData): Promise<VaccineState> {
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || undefined;
  const ageMonths = Number(formData.get('ageMonths') ?? NaN);
  const doseNumber = Number(formData.get('doseNumber') ?? 1);

  if (!code) return { error: 'შეიყვანეთ კოდი' };
  if (!name) return { error: 'შეიყვანეთ დასახელება' };
  if (Number.isNaN(ageMonths)) return { error: 'მიუთითეთ ასაკი თვეებში' };

  try {
    await apiMutate('/admin/vaccines', 'POST', {
      code,
      name,
      description,
      ageMonths,
      doseNumber: doseNumber || 1,
    });

    revalidatePath('/admin/vaccines');
    return { notice: 'აცრა დაემატა კალენდარში' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'დამატება ვერ მოხერხდა' };
  }
}

export async function deleteVaccine(_prev: VaccineState, formData: FormData): Promise<VaccineState> {
  const id = String(formData.get('id') ?? '');

  try {
    await apiMutate(`/admin/vaccines/${id}`, 'DELETE');
    revalidatePath('/admin/vaccines');
    return { notice: 'აცრა წაშლილია' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'წაშლა ვერ მოხერხდა' };
  }
}
