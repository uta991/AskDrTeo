'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, apiMutate } from '@/lib/session';

export interface ChatMessage {
  id: string;
  body: string | null;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'SYSTEM';
  createdAt: string;
  senderId: string | null;
  sender: { id: string; firstName: string; lastName: string | null; role: string } | null;
}

export interface Thread {
  id: string;
  subject: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
  messages: ChatMessage[];
}

export interface ChatState {
  error?: string;
}

/** მშობლის მხარე: პირველი წერილი ხსნის საუბარს, შემდეგი მას აგრძელებს. */
export async function sendParentMessage(
  message: string,
  conversationId?: string,
): Promise<ChatState> {
  if (!message.trim()) return { error: 'დაწერეთ შეტყობინება' };

  try {
    if (conversationId) {
      await apiMutate(`/chat/conversations/${conversationId}/messages`, 'POST', {
        body: message.trim(),
      });
    } else {
      await apiMutate('/chat/conversations', 'POST', { message: message.trim() });
    }

    revalidatePath('/chat');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გაგზავნა ვერ მოხერხდა' };
  }
}

/** ოპერატორის პასუხი. */
export async function sendStaffMessage(
  conversationId: string,
  message: string,
): Promise<ChatState> {
  if (!message.trim()) return { error: 'დაწერეთ პასუხი' };

  try {
    await apiMutate(`/admin/chat/conversations/${conversationId}/messages`, 'POST', {
      body: message.trim(),
    });

    revalidatePath('/admin/chat');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'გაგზავნა ვერ მოხერხდა' };
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
