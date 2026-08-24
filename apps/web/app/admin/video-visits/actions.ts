'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, apiMutate } from '@/lib/session';
import type { JoinResult, VisitStatus } from '../../video-visit/actions';

export interface QueueVisit {
  id: string;
  status: VisitStatus;
  scheduledAt: string | null;
  reason: string | null;
  staffNote: string | null;
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  child: {
    id: string;
    firstName: string;
    lastName: string | null;
    birthDate: string;
    gender: string | null;
  } | null;
  parentWaiting: boolean;
  parentJoinedAt: string | null;
  staffJoinedAt: string | null;
}

export interface Queue {
  date: string;
  capacity: number;
  visits: QueueVisit[];
}

export async function getQueue(date?: string): Promise<Queue | null> {
  return apiFetch<Queue>(`/admin/video-visits${date ? `?date=${date}` : ''}`);
}

/** ზუსტი საათის დანიშვნა — მშობელს მაშინვე მიდის SMS. */
export async function scheduleVisit(
  id: string,
  scheduledAt: string,
  staffNote?: string,
): Promise<{ error?: string }> {
  try {
    await apiMutate(`/admin/video-visits/${id}/schedule`, 'PATCH', { scheduledAt, staffNote });
    revalidatePath('/admin/video-visits');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'დანიშვნა ვერ მოხერხდა' };
  }
}

/** ექიმის ჩართვა — მხოლოდ Super Admin-ს გაუშვებს სერვერი. */
export async function joinAsStaff(id: string): Promise<{ data?: JoinResult; error?: string }> {
  try {
    const data = await apiMutate<JoinResult>(`/admin/video-visits/${id}/join`, 'POST');
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ჩართვა ვერ მოხერხდა' };
  }
}

export async function finishVisit(id: string): Promise<{ error?: string }> {
  try {
    await apiMutate(`/admin/video-visits/${id}/finish`, 'PATCH');
    revalidatePath('/admin/video-visits');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ვერ დასრულდა' };
  }
}
