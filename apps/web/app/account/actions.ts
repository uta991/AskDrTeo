'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface RedeemState {
  error?: string;
  notice?: string;
}

interface RedeemResult {
  type: 'DISCOUNT' | 'FREE_PLAN';
  message: string;
}

/** პრომო კოდის გააქტიურება — მშობლის კაბინეტიდან. */
export async function redeemPromo(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const code = String(formData.get('code') ?? '').trim();

  if (!code) return { error: 'შეიყვანეთ პრომო კოდი' };

  try {
    const result = await apiMutate<RedeemResult>('/promo/redeem', 'POST', { code });
    // პაკეტი შეიცვალა — გვერდი ძველ მონაცემს ვეღარ აჩვენებს
    revalidatePath('/account');
    return { notice: result.message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'კოდი ვერ გააქტიურდა' };
  }
}
