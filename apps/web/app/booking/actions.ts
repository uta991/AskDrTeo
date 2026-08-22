'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface Appointment {
  id: string;
  preferredAt: string;
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

/** ვიზიტის მოთხოვნა — დროს პედიატრი ადასტურებს. */
export async function requestVisit(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const date = String(formData.get('date') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim();
  const childId = String(formData.get('childId') ?? '').trim() || undefined;
  const reason = String(formData.get('reason') ?? '').trim() || undefined;

  if (!date || !time) return { error: 'აირჩიეთ თარიღი და დრო' };

  try {
    await apiMutate('/appointments', 'POST', {
      preferredAt: new Date(`${date}T${time}`).toISOString(),
      childId,
      reason,
    });

    revalidatePath('/booking');
    return { notice: 'მოთხოვნა გაიგზავნა — დადასტურებას შეტყობინებით მიიღებთ' };
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
