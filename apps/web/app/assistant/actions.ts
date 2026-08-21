'use server';

import { apiMutate } from '@/lib/session';

export interface AskResult {
  conversationId?: string;
  answer?: string;
  error?: string;
}

/**
 * შეკითხვა ასისტენტს.
 *
 * `conversationId` კლიენტიდან ბრუნდება უკან, რომ საუბრის ძაფი
 * გაგრძელდეს — სერვერზე მდგომარეობას არ ვინახავთ.
 */
export async function askAssistant(
  message: string,
  conversationId?: string,
  childId?: string,
): Promise<AskResult> {
  if (!message.trim()) return { error: 'დაწერეთ შეკითხვა' };

  try {
    const result = await apiMutate<{
      conversationId: string;
      message: { content: string };
    }>('/ai/ask', 'POST', { message: message.trim(), conversationId, childId });

    return { conversationId: result.conversationId, answer: result.message.content };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ასისტენტი ვერ გვიპასუხა' };
  }
}
