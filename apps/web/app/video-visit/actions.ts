'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, apiMutate, apiUpload } from '@/lib/session';

export interface VisitDay {
  date: string;
  capacity: number;
  used: number;
  free: number;
}

export interface VisitOffer {
  amountMinor: number;
  currency: string;
  price: string;
  dailyCapacity: number;
  days: VisitDay[];
}

export type VisitStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'LIVE'
  | 'DONE'
  | 'CANCELED'
  | 'NO_SHOW';

export interface MyVisit {
  id: string;
  date: string;
  scheduledAt: string | null;
  status: VisitStatus;
  reason: string | null;
  staffNote: string | null;
  child: { id: string; firstName: string } | null;
  canJoin: boolean;
}

export interface JoinResult {
  id: string;
  roomUrl: string;
  conversationId: string;
  otherSideReady: boolean;
  status: VisitStatus;
}

/**
 * ვიდეო ვიზიტის ყიდვა.
 *
 * ჯავშანი გადახდის დადასტურების შემდეგ იქმნება — ბანკიდან დაბრუნებას
 * არ ვენდობით, სერვერი თავად ამოწმებს სტატუსს.
 */
export async function buyVisit(
  date: string,
  childId?: string,
  reason?: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const result = await apiMutate<{ url: string }>('/payments/tbc/create', 'POST', {
      visitDate: date,
      childId: childId || undefined,
      reason: reason || undefined,
    });
    return { url: result.url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გადახდა ვერ დაიწყო' };
  }
}

/** ოთახში შესვლა — მეორე მხარეს სტატუსი მაშინვე უჩანს. */
export async function joinVisit(id: string): Promise<{ data?: JoinResult; error?: string }> {
  try {
    const data = await apiMutate<JoinResult>(`/video-visits/${id}/join`, 'POST');
    revalidatePath('/video-visit');
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ჩართვა ვერ მოხერხდა' };
  }
}

export async function getOffer(): Promise<VisitOffer | null> {
  return apiFetch<VisitOffer>('/video-visits/offer');
}

export async function getMyVisits(): Promise<MyVisit[] | null> {
  return apiFetch<MyVisit[]>('/video-visits');
}

// ─── ვიზიტის ჩატი ───────────────────────────────────────────────────

export interface VisitAttachment {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  processing: boolean;
  url: string | null;
}

export interface VisitMessage {
  id: string;
  body: string | null;
  createdAt: string;
  senderId: string | null;
  sender: { id: string; firstName: string; lastName: string | null; role: string } | null;
  attachments: VisitAttachment[];
}

/** ვიზიტის ჩატი — ერთი მისამართი მშობელსაც და ექიმსაც. */
export async function visitMessages(
  id: string,
  admin: boolean,
): Promise<{ messages: VisitMessage[] } | null> {
  const base = admin ? '/admin/video-visits' : '/video-visits';
  return apiFetch<{ messages: VisitMessage[] }>(`${base}/${id}/messages`);
}

export async function sendVisitMessage(
  id: string,
  admin: boolean,
  body: string,
  assetIds: string[] = [],
): Promise<{ error?: string }> {
  if (!body.trim() && !assetIds.length) return { error: 'შეტყობინება ცარიელია' };

  const base = admin ? '/admin/video-visits' : '/video-visits';

  try {
    await apiMutate(`${base}/${id}/messages`, 'POST', { body: body.trim(), assetIds });
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ვერ გაიგზავნა' };
  }
}

/** ფოტოს ატვირთვა — იმავე მისამართით, რითიც ჩვეულებრივი ჩატი სარგებლობს. */
export async function uploadVisitPhoto(
  formData: FormData,
): Promise<{ id?: string; error?: string }> {
  const file = formData.get('file');
  if (!(file instanceof File) || !file.size) return { error: 'ფაილი ვერ წავიკითხეთ' };

  try {
    const asset = await apiUpload<{ assetId: string }>('/media/chat-attachment', file);
    return { id: asset.assetId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ატვირთვა ვერ მოხერხდა' };
  }
}

export interface Presence {
  parentPresent: boolean;
  staffPresent: boolean;
  parentName: string;
  staffName: string | null;
  status: VisitStatus;
}

/**
 * ვინ არის ოთახში ახლა.
 *
 * გამომძახებელი თავის ნიშანსაც ტოვებს — ანუ ერთი მოთხოვნა ერთდროულად
 * ამბობს „აქ ვარ" და კითხულობს „მეორე მხარე შემოვიდა?".
 */
export async function visitPresence(id: string, admin: boolean): Promise<Presence | null> {
  const base = admin ? '/admin/video-visits' : '/video-visits';
  return apiFetch<Presence>(`${base}/${id}/presence`);
}
