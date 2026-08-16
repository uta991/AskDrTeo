'use server';

import { apiMutate } from '@/lib/session';

export interface ProfileState {
  error?: string;
  notice?: string;
}

/**
 * საკუთარი პაროლის შეცვლა.
 *
 * ადმინის „პაროლის დაყენებისგან" იმით განსხვავდება, რომ მიმდინარე
 * პაროლს ითხოვს — მიტოვებულ სესიაზე ვერავინ შეცვლის.
 */
export async function changePassword(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!currentPassword) return { error: 'შეიყვანეთ მიმდინარე პაროლი' };
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
    return { error: 'ახალი პაროლი: მინიმუმ 8 სიმბოლო, ასო და ციფრი' };
  }
  if (newPassword !== confirmPassword) return { error: 'პაროლები არ ემთხვევა' };

  try {
    await apiMutate('/auth/change-password', 'POST', { currentPassword, newPassword });
    return { notice: 'პაროლი შეიცვალა' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'პაროლი ვერ შეიცვალა' };
  }
}
