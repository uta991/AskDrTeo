import { create } from 'zustand';
import { api } from '@/api/client';

export type VisitStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'LIVE'
  | 'DONE'
  | 'CANCELED'
  | 'NO_SHOW';

export interface VisitDay {
  date: string;
  capacity: number;
  used: number;
  free: number;
}

export interface VisitOffer {
  /** ჩვეულებრივი ფასი */
  basePrice: string;
  /** რა დახვდება ახლა — ფასდაკლება უკვე გათვალისწინებულია */
  price: string;
  /** რამდენ პროცენტს ფარავს მოქმედი უფლება */
  coverPercent: number;
  dailyCapacity: number;
  days: VisitDay[];
  /** უფასო ვიზიტების ნაშთი — პრომო კოდიდან */
  freeCredits: number;
}

export interface MyVisit {
  id: string;
  date: string;
  scheduledAt: string | null;
  status: VisitStatus;
  reason: string | null;
  staffNote: string | null;
  child: { id: string; firstName: string } | null;
  canJoin: boolean;
  opensAt: string | null;
}

/** ზარის წვდომა — ინტერფეისი ჩვენია, Agora მხოლოდ არხს იძლევა. */
export interface CallAccess {
  id: string;
  appId: string;
  channel: string;
  token: string;
  uid: number;
  displayName: string;
  conversationId: string;
  otherSideReady: boolean;
  status: VisitStatus;
}

interface VideoVisitsState {
  offer: VisitOffer | null;
  items: MyVisit[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  load: () => Promise<void>;
  book: (input: { date: string; childId?: string; reason?: string }) => Promise<void>;
  join: (id: string) => Promise<CallAccess | null>;
}

/**
 * ვიზიტი პედიატრთან.
 *
 * მშობელი მხოლოდ დღეს ირჩევს — ზუსტ საათს ექიმი ნიშნავს. უფასო
 * უფლების არსებობისას ჯავშანი ბანკს გვერდს უვლის.
 */
export const useVideoVisits = create<VideoVisitsState>((set, get) => ({
  offer: null,
  items: [],
  loading: false,
  error: null,
  notice: null,

  async load() {
    set({ loading: true, error: null });
    try {
      const [offer, items] = await Promise.all([
        api<VisitOffer>('/video-visits/offer'),
        api<MyVisit[]>('/video-visits'),
      ]);
      set({ offer, items });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ვერ ჩაიტვირთა' });
    } finally {
      set({ loading: false });
    }
  },

  async book(input) {
    set({ error: null, notice: null });

    // ბარათით გადახდა ტელეფონში ჯერ არ არის — უფასო უფლების გარეშე
    // მშობელს საიტზე ვგზავნით, თორემ ღილაკი უშედეგოდ დაიხურებოდა
    if (!get().offer?.freeCredits) {
      set({ error: 'ბარათით გადახდა ჯერ საიტზეა — askdrteo.com' });
      return;
    }

    try {
      await api('/video-visits/free', { method: 'POST', body: input });
      set({ notice: 'ჯავშანი მიღებულია — ექიმი საათს დანიშნავს და შეგატყობინებთ' });
      await get().load();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ჯავშანი ვერ შეიქმნა' });
    }
  },

  async join(id) {
    set({ error: null });
    try {
      return await api<CallAccess>(`/video-visits/${id}/join`, { method: 'POST' });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'ჩართვა ვერ მოხერხდა' });
      return null;
    }
  },
}));

/** ვინ არის ოთახში ახლა — გამომძახებელი თავის ნიშანსაც ტოვებს. */
export interface Presence {
  parentPresent: boolean;
  staffPresent: boolean;
  staffName: string | null;
  status: VisitStatus;
}

export function visitPresence(id: string): Promise<Presence> {
  return api<Presence>(`/video-visits/${id}/presence`);
}

// ─── ვიზიტის ჩატი ────────────────────────────────────────────────────

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

/**
 * ვიზიტის ჩატი.
 *
 * ჩვეულებრივი ჩატისგან ცალკეა: ის პაკეტის ფუნქციაა, ვიზიტი კი
 * ცალკე გადახდილია და პაკეტზე არ უნდა იყოს დამოკიდებული.
 */
export function visitMessages(id: string): Promise<{ messages: VisitMessage[] }> {
  return api<{ messages: VisitMessage[] }>(`/video-visits/${id}/messages`);
}

export function sendVisitMessage(
  id: string,
  body: string,
  assetIds: string[] = [],
): Promise<void> {
  return api(`/video-visits/${id}/messages`, {
    method: 'POST',
    body: { body: body.trim() || undefined, assetIds },
  });
}
