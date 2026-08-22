'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, apiMutate, apiUpload } from '@/lib/session';

export interface ChatAttachment {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  processing: boolean;
  url: string | null;
}

export interface ChatMessage {
  id: string;
  body: string | null;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'SYSTEM';
  createdAt: string;
  senderId: string | null;
  sender: { id: string; firstName: string; lastName: string | null; role: string } | null;
  attachments: ChatAttachment[];
}

export interface ConversationRow {
  id: string;
  subject: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  closedAt: string | null;
  lastMessageAt: string | null;
  lastMessage: string | null;
  operators: string[];
  unread: number;
}

export interface Thread {
  id: string;
  subject: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
  assignedOperatorId?: string | null;
  messages: ChatMessage[];
}

export interface ChatState {
  error?: string;
  /** ახლად გახსნილი საუბარი — კლიენტმა ძაფი მაშინვე უნდა ჩატვირთოს */
  conversationId?: string;
}

/** მშობლის მხარე: პირველი წერილი ხსნის საუბარს, შემდეგი მას აგრძელებს. */
export async function sendParentMessage(
  message: string,
  conversationId?: string,
  assetIds: string[] = [],
): Promise<ChatState> {
  if (!message.trim() && !assetIds.length) return { error: 'დაწერეთ შეტყობინება' };

  try {
    if (conversationId) {
      await apiMutate(`/chat/conversations/${conversationId}/messages`, 'POST', {
        body: message.trim() || undefined,
        assetIds,
      });

      revalidatePath('/chat');
      return { conversationId };
    }

    // ახალი საუბარი ტექსტს ითხოვს; ფაილი მეორე შეტყობინებად მიდის
    const started = await apiMutate<{ id: string }>('/chat/conversations', 'POST', {
      message: message.trim() || 'ფაილი მიმაგრებულია',
    });

    if (assetIds.length) {
      await apiMutate(`/chat/conversations/${started.id}/messages`, 'POST', { assetIds });
    }

    revalidatePath('/chat');
    // ავტომატური პასუხი უკვე ჩაწერილია — id-ით ძაფს კლიენტი მოიტანს
    return { conversationId: started.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გაგზავნა ვერ მოხერხდა' };
  }
}

/**
 * ჩატის გახსნა ღილაკით.
 *
 * ტექსტის გარეშე იხსნება — მშობელს მაშინვე ხვდება ავტომატური
 * მისალმება და ხედავს, რომ სისტემა მუშაობს.
 */
export async function startConversation(): Promise<ChatState> {
  try {
    const thread = await apiMutate<{ id: string }>('/chat/conversations', 'POST', {});
    revalidatePath('/chat');
    return { conversationId: thread.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ჩატი ვერ გაიხსნა' };
  }
}

/** ოპერატორის პასუხი. */
export async function sendStaffMessage(
  conversationId: string,
  message: string,
  assetIds: string[] = [],
): Promise<ChatState> {
  if (!message.trim() && !assetIds.length) return { error: 'დაწერეთ პასუხი' };

  try {
    await apiMutate(`/admin/chat/conversations/${conversationId}/messages`, 'POST', {
      body: message.trim() || undefined,
      assetIds,
    });

    revalidatePath('/admin/chat');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გაგზავნა ვერ მოხერხდა' };
  }
}

/** საუბრის აღება — ოპერატორი მიემაგრება და სახელით ესალმება. */
export async function takeConversation(conversationId: string): Promise<ChatState> {
  try {
    await apiMutate(`/admin/chat/conversations/${conversationId}/take`, 'PATCH');
    revalidatePath('/admin/chat');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'აღება ვერ მოხერხდა' };
  }
}

export async function closeConversation(conversationId: string): Promise<ChatState> {
  try {
    await apiMutate(`/admin/chat/conversations/${conversationId}/close`, 'PATCH');
    revalidatePath('/admin/chat');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'დახურვა ვერ მოხერხდა' };
  }
}

/** ძაფის თავიდან წამოღება — ჩატი ავტომატურად ახლდება. */
export async function refreshThread(
  conversationId: string,
  staff = false,
): Promise<Thread | null> {
  const path = staff
    ? `/admin/chat/conversations/${conversationId}`
    : `/chat/conversations/${conversationId}`;

  return apiFetch<Thread>(path);
}

/** ფაილის ატვირთვა ჩატისთვის — ფოტო ან ვიდეო. */
export async function uploadAttachment(formData: FormData): Promise<{ id?: string; error?: string }> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'ფაილი არ არის არჩეული' };

  try {
    // ატვირთვა `assetId`-ს აბრუნებს — შეტყობინებას სწორედ ეს სჭირდება
    const asset = await apiUpload<{ assetId: string }>('/media/chat-attachment', file);
    return { id: asset.assetId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ატვირთვა ვერ მოხერხდა' };
  }
}
