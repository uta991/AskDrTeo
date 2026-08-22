import { create } from 'zustand';
import { api } from '@/api/client';

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
  sender: { id: string; firstName: string; lastName: string | null; role: string } | null;
  attachments: ChatAttachment[];
}

export interface Conversation {
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
  status: Conversation['status'];
  messages: ChatMessage[];
}

interface ChatState {
  conversations: Conversation[];
  thread: Thread | null;
  loading: boolean;
  sending: boolean;
  error: string | null;
  loadConversations: () => Promise<void>;
  openThread: (id: string) => Promise<void>;
  start: () => Promise<void>;
  send: (body: string, assetIds?: string[]) => Promise<void>;
  reset: () => void;
}

/**
 * ჩატი კონსულტანტთან.
 *
 * ერთი მუდმივად გახსნილი ძაფის ნაცვლად — თარიღიანი ისტორია: დახურული
 * საუბრები რჩება და მშობელს შეუძლია ნახოს, ვისთან რაზე ისაუბრა.
 */
export const useChat = create<ChatState>((set, get) => ({
  conversations: [],
  thread: null,
  loading: false,
  sending: false,
  error: null,

  async loadConversations() {
    set({ loading: true, error: null });
    try {
      const conversations = await api<Conversation[]>('/chat/conversations');
      set({ conversations });

      // მიმდინარე საუბარი თავისთავად იხსნება; დახურულებს ისტორია აჩვენებს
      const active = conversations.find((row) => row.status !== 'CLOSED');
      if (active) await get().openThread(active.id);
      else set({ thread: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ჩატი ვერ ჩაიტვირთა' });
    } finally {
      set({ loading: false });
    }
  },

  async openThread(id) {
    const thread = await api<Thread>(`/chat/conversations/${id}`);
    set({ thread });
  },

  /** ღილაკი „ჩატის დაწყება" — საუბარი ტექსტის გარეშე იხსნება. */
  async start() {
    set({ sending: true, error: null });
    try {
      const thread = await api<Thread>('/chat/conversations', { method: 'POST', body: {} });
      set({ thread });
      await get().loadConversations();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ჩატი ვერ გაიხსნა' });
    } finally {
      set({ sending: false });
    }
  },

  async send(body, assetIds = []) {
    const text = body.trim();
    if (!text && !assetIds.length) return;

    set({ sending: true, error: null });
    try {
      const thread = get().thread;

      if (thread) {
        await api(`/chat/conversations/${thread.id}/messages`, {
          method: 'POST',
          body: { body: text || undefined, assetIds },
        });
        await get().openThread(thread.id);
      } else {
        const created = await api<Thread>('/chat/conversations', {
          method: 'POST',
          body: { message: text || 'ფაილი მიმაგრებულია' },
        });
        if (assetIds.length) {
          await api(`/chat/conversations/${created.id}/messages`, {
            method: 'POST',
            body: { assetIds },
          });
        }
        await get().openThread(created.id);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'გაგზავნა ვერ მოხერხდა' });
    } finally {
      set({ sending: false });
    }
  },

  reset() {
    set({ conversations: [], thread: null, error: null });
  },
}));
