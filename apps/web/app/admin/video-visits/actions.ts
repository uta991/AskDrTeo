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
  diagnosis: string | null;
  diagnosisNote: string | null;
  prescription: string | null;
  weightKg: number | null;
  heightCm: number | null;
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

/** ვიზიტის გაუქმება — მშობელს SMS მიდის და ჯავშანი უბრუნდება. */
export async function cancelVisit(
  id: string,
  reason?: string,
): Promise<{ error?: string }> {
  try {
    await apiMutate(`/admin/video-visits/${id}/cancel`, 'PATCH', { reason });
    revalidatePath('/admin/video-visits');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გაუქმება ვერ მოხერხდა' };
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

/** რიგის ცოცხალი მდგომარეობა — ვინ შემოვიდა ოთახში. */
export async function queuePresence(date?: string): Promise<Record<string, boolean>> {
  const queue = await getQueue(date);
  if (!queue) return {};

  return Object.fromEntries(queue.visits.map((visit) => [visit.id, visit.parentWaiting]));
}

// ─── ექიმის დასკვნა ─────────────────────────────────────────────────

export interface DiagnosisOption {
  id: string;
  name: string;
  description: string | null;
  advice: string | null;
  usageCount: number;
}

export interface DoseItem {
  medicationId: string;
  name: string;
  note: string | null;
  needsReview: boolean;
  dose: {
    singleMgMin: number;
    singleMgMax: number;
    singleMlMin?: number;
    singleMlMax?: number;
    dosesPerDay: number;
  } | null;
  blocked: string | null;
  concentration: string | null;
}

export interface PrescriptionSuggestion {
  description: string | null;
  advice: string | null;
  items: DoseItem[];
}

/** დიაგნოზის შეთავაზება — ცნობარი ექიმის ნაწერით თავად ივსება. */
export async function suggestDiagnoses(q: string): Promise<DiagnosisOption[]> {
  return (
    (await apiFetch<DiagnosisOption[]>(
      `/admin/video-visits/diagnoses?q=${encodeURIComponent(q)}`,
    )) ?? []
  );
}

/** რეკომენდებული მედიკამენტები — დოზა ბავშვის წონაზეა დათვლილი. */
export async function suggestPrescription(
  diagnosis: string,
  weightKg: number,
  ageMonths: number,
): Promise<PrescriptionSuggestion | null> {
  const params = new URLSearchParams({
    diagnosis,
    weightKg: String(weightKg),
    ageMonths: String(ageMonths),
  });

  return apiFetch<PrescriptionSuggestion>(
    `/admin/video-visits/diagnoses/prescription?${params}`,
  );
}

/** დასკვნის შენახვა — მშობელს მაშინვე მიდის შეტყობინება და SMS. */
export async function saveConclusion(
  id: string,
  body: {
    diagnosis: string;
    diagnosisNote?: string;
    prescription?: string;
    weightKg?: number;
    heightCm?: number;
  },
): Promise<{ error?: string }> {
  try {
    await apiMutate(`/admin/video-visits/${id}/conclusion`, 'PATCH', body);
    revalidatePath('/admin/video-visits');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ვერ შევინახეთ' };
  }
}
