'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface Appointment {
  id: string;
  preferredAt: string | null;
  scheduledAt: string | null;
  status: 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'CANCELED' | 'DONE';
  reason: string | null;
  staffNote: string | null;
  usedFreeVisit: boolean;
  child: { id: string; firstName: string } | null;
}

export interface Quota {
  limit: number;
  used: number;
  remaining: number;
}

export interface BookingState {
  error?: string;
  notice?: string;
}

/**
 * ვიზიტის მოთხოვნა.
 *
 * მშობელი დროს არ ირჩევს — კონკრეტულ საათს ექიმი ნიშნავს და
 * მშობელს შეტყობინებითა და SMS-ით ატყობინებს.
 */
export async function requestVisit(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const childId = String(formData.get('childId') ?? '').trim() || undefined;
  const reason = String(formData.get('reason') ?? '').trim() || undefined;

  try {
    await apiMutate('/appointments', 'POST', { childId, reason });

    revalidatePath('/booking');
    return {
      notice: 'მოთხოვნა გაიგზავნა — ექიმი დროს დანიშნავს და შეტყობინებით და SMS-ით შეგატყობინებთ',
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'მოთხოვნა ვერ გაიგზავნა' };
  }
}

export async function cancelVisit(id: string): Promise<BookingState> {
  try {
    await apiMutate(`/appointments/${id}/cancel`, 'PATCH');
    revalidatePath('/booking');
    return { notice: 'ჯავშანი გაუქმდა' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გაუქმება ვერ მოხერხდა' };
  }
}

/** კონსულტაციის ლიმიტის ყიდვა — გამოწერას არ ცვლის. */
export async function startPackCheckout(
  packCode: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const result = await apiMutate<{ url: string }>('/payments/tbc/create', 'POST', { packCode });
    return { url: result.url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გადახდა ვერ დაიწყო' };
  }
}
