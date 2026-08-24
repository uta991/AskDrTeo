'use server';

import { apiFetch, apiMutate } from '@/lib/session';

export interface PaymentStatusView {
  payId: string | null;
  final: boolean;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';
  amountMinor: number;
  currency: string;
  planName: string | null;
  validUntil: string | null;
  message: string;
}

/**
 * გადახდის დაწყება.
 *
 * ბრაუზერი მხოლოდ ბანკის გვერდის მისამართს იღებს — თანხასაც და
 * პაკეტსაც სერვერი განსაზღვრავს პაკეტის კოდიდან. კლიენტს გადმოცემული
 * ფასი რომ გვენდო, ბრაუზერიდან 1 თეთრად გაგზავნა იქნებოდა შესაძლებელი.
 */
export async function startCheckout(
  planCode: string,
  interval: 'MONTH' | 'YEAR',
): Promise<{ url?: string; error?: string }> {
  try {
    const result = await apiMutate<{ url: string }>('/payments/tbc/create', 'POST', {
      planCode,
      interval,
    });
    return { url: result.url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გადახდა ვერ დაიწყო' };
  }
}

/**
 * გადახდის რეალური სტატუსი.
 *
 * პასუხს ბანკიდან სერვერი იღებს — დაბრუნების გვერდს არაფერს ვეკითხებით.
 * მისამართის ხელით აკრეფა შედეგს ვერ შეცვლის.
 */
export async function checkPayment(orderId: string): Promise<PaymentStatusView | null> {
  return apiFetch<PaymentStatusView>(`/payments/tbc/${encodeURIComponent(orderId)}/status`);
}
