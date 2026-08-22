'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface AdminAppointment {
  id: string;
  preferredAt: string;
  scheduledAt: string | null;
  status: 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'CANCELED' | 'DONE';
  reason: string | null;
  staffNote: string | null;
  usedFreeVisit: boolean;
  createdAt: string;
  parent: { id: string; firstName: string; lastName: string | null; phone: string | null } | null;
  child: { id: string; firstName: string; birthDate: string } | null;
}

export interface DecisionState {
  error?: string;
  notice?: string;
}

/** დადასტურება, უარი ან შესრულებულად მონიშვნა — ერთი გზა სამივესთვის. */
export async function decideAppointment(
  id: string,
  decision: 'confirm' | 'decline' | 'done',
  scheduledAt?: string,
  staffNote?: string,
): Promise<DecisionState> {
  try {
    await apiMutate(`/admin/appointments/${id}/${decision}`, 'PATCH', {
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      staffNote: staffNote?.trim() || undefined,
    });

    revalidatePath('/admin/appointments');
    return { notice: 'შენახულია' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ოპერაცია ვერ შესრულდა' };
  }
}
