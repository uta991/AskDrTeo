'use server';

import { redirect } from 'next/navigation';
import { apiMutate, clearSession } from '@/lib/session';

export interface DeleteAccountState {
  error?: string;
}

/** სიტყვა, რომელიც მომხმარებელმა ხელით უნდა აკრიფოს. */
const CONFIRM_WORD = 'წაშლა';

/**
 * საკუთარი ანგარიშის წაშლა ვებიდან.
 *
 * Google Play მოითხოვს ბმულს, სადაც ანგარიშის წაშლა აპის დაყენების
 * გარეშეც შეიძლება. სიტყვის აკრეფა შემთხვევით დაჭერას გამორიცხავს.
 */
export async function deleteOwnAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  if (String(formData.get('confirm') ?? '').trim() !== CONFIRM_WORD) {
    return { error: `დასადასტურებლად ჩაწერეთ „${CONFIRM_WORD}"` };
  }

  try {
    await apiMutate('/account', 'DELETE', { confirm: 'DELETE' });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ანგარიში ვერ წაიშალა' };
  }

  await clearSession();
  redirect('/delete-account?done=1');
}
