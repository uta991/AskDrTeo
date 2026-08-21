import { create } from 'zustand';
import { api } from '@/api/client';

export interface AiMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

interface AskResponse {
  conversationId: string;
  message: { content: string };
}

interface AiState {
  messages: AiMessage[];
  conversationId?: string;
  sending: boolean;
  error: string | null;
  ask: (message: string, childId?: string) => Promise<void>;
  reset: () => void;
}

/**
 * საუბარი ასისტენტთან.
 *
 * ისტორია მეხსიერებაშია, ძაფს კი `conversationId` ინახავს — სერვერზე
 * კონტექსტი მასზეა მიბმული, კლიენტს გადაგზავნა არ სჭირდება.
 */
export const useAi = create<AiState>((set, get) => ({
  messages: [],
  sending: false,
  error: null,

  async ask(message, childId) {
    const question = message.trim();
    if (!question || get().sending) return;

    set((state) => ({
      messages: [...state.messages, { role: 'USER', content: question }],
      sending: true,
      error: null,
    }));

    try {
      const result = await api<AskResponse>('/ai/ask', {
        method: 'POST',
        body: { message: question, conversationId: get().conversationId, childId },
      });

      set((state) => ({
        messages: [...state.messages, { role: 'ASSISTANT', content: result.message.content }],
        conversationId: result.conversationId,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ასისტენტი ვერ გვიპასუხა' });
    } finally {
      set({ sending: false });
    }
  },

  reset() {
    set({ messages: [], conversationId: undefined, error: null });
  },
}));
