'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiMutate, apiUpload } from '@/lib/session';

export interface ChildFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** არასავალდებულო ტექსტი — ცარიელი ველი საერთოდ არ უნდა გაიგზავნოს. */
function text(formData: FormData, name: string): string | undefined {
  const value = String(formData.get(name) ?? '').trim();
  return value || undefined;
}

/** არასავალდებულო რიცხვი; მძიმეც მიიღება, რადგან ქართულ კლავიატურაზე ასე იწერება. */
function num(formData: FormData, name: string): number | undefined {
  const raw = String(formData.get(name) ?? '').trim().replace(',', '.');
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function date(formData: FormData, name: string): string | undefined {
  const value = String(formData.get(name) ?? '').trim();
  return value ? new Date(value).toISOString() : undefined;
}

/**
 * ბავშვის პროფილის შექმნა.
 *
 * ფოტო ჯერ იტვირთება და მხოლოდ შემდეგ იქმნება პროფილი: ატვირთვის
 * ჩავარდნისას უფოტოო ჩანაწერი არ უნდა დარჩეს.
 */
export async function createChild(
  _prev: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const firstName = String(formData.get('firstName') ?? '').trim();
  const birthDate = String(formData.get('birthDate') ?? '').trim();
  const photo = formData.get('photo');

  const fieldErrors: Record<string, string> = {};
  if (!firstName) fieldErrors.firstName = 'შეიყვანეთ ბავშვის სახელი';
  if (!birthDate) fieldErrors.birthDate = 'მიუთითეთ დაბადების თარიღი';
  else if (new Date(birthDate) > new Date()) fieldErrors.birthDate = 'თარიღი მომავალშია';

  if (!(photo instanceof File) || photo.size === 0) {
    fieldErrors.photo = 'ბავშვის ფოტო სავალდებულოა';
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };

  try {
    const uploaded = await apiUpload<{ assetId: string }>('/media/avatar', photo as File);

    await apiMutate('/children', 'POST', {
      firstName,
      lastName: text(formData, 'lastName'),
      birthDate: new Date(birthDate).toISOString(),
      gender: text(formData, 'gender'),
      avatarAssetId: uploaded.assetId,
      gestationalWeek: num(formData, 'gestationalWeek'),
      birthWeight: num(formData, 'birthWeight'),
      birthHeight: num(formData, 'birthHeight'),
      motherFirstName: text(formData, 'motherFirstName'),
      motherLastName: text(formData, 'motherLastName'),
      motherBirthDate: date(formData, 'motherBirthDate'),
      fatherFirstName: text(formData, 'fatherFirstName'),
      fatherLastName: text(formData, 'fatherLastName'),
      fatherBirthDate: date(formData, 'fatherBirthDate'),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'პროფილი ვერ შეიქმნა' };
  }

  revalidatePath('/account');
  redirect('/account');
}
