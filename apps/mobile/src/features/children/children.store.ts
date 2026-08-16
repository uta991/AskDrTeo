import { create } from 'zustand';
import { api } from '@/api/client';
import { isFresh } from '../freshness';

export type AgeStage =
  | 'NEWBORN'
  | 'INFANT'
  | 'TODDLER'
  | 'PRESCHOOL'
  | 'SCHOOL'
  | 'TEEN';

export interface Child {
  id: string;
  firstName: string;
  lastName: string | null;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  avatarUrl: string | null;
  gestationalWeek: number | null;
  birthWeight: number | null;
  birthHeight: number | null;
  motherFirstName: string | null;
  motherLastName: string | null;
  motherBirthDate: string | null;
  fatherFirstName: string | null;
  fatherLastName: string | null;
  fatherBirthDate: string | null;
  ageMonths: number;
  ageLabel: string;
  correctedAgeMonths: number;
  stage: AgeStage;
  isPreterm: boolean;
}

export interface CreateChildInput {
  firstName: string;
  lastName?: string;
  birthDate: string;
  avatarAssetId?: string;
  gender?: 'MALE' | 'FEMALE';
  gestationalWeek?: number;
  birthWeight?: number;
  birthHeight?: number;
  motherFirstName?: string;
  motherLastName?: string;
  motherBirthDate?: string;
  fatherFirstName?: string;
  fatherLastName?: string;
  fatherBirthDate?: string;
}

interface ChildrenState {
  children: Child[];
  loading: boolean;
  /** მიმდინარედ არჩეული ბავშვი — მისალმებასა და კონტენტის ფილტრში გამოიყენება */
  activeChildId: string | null;
  load: (force?: boolean) => Promise<void>;
  loadedAt?: number;
  create: (input: CreateChildInput) => Promise<Child>;
  setActive: (id: string) => void;
  reset: () => void;
}

export const useChildren = create<ChildrenState>((set, get) => ({
  children: [],
  loading: false,
  activeChildId: null,

  async load(force) {
    if (!force && isFresh(get().loadedAt)) return;

    set({ loading: true });
    try {
      const children = await api<Child[]>('/children');
      set({
        children,
        // არჩეული ბავშვი თუ წაიშალა, პირველზე ვბრუნდებით
        activeChildId:
          children.find((c) => c.id === get().activeChildId)?.id ?? children[0]?.id ?? null,
        loadedAt: Date.now(),
      });
    } finally {
      set({ loading: false });
    }
  },

  async create(input) {
    const child = await api<Child>('/children', { method: 'POST', body: input });
    // ახლადშექმნილი პროფილი მაშინვე აქტიური ხდება
    set((s) => ({
      children: [child, ...s.children],
      activeChildId: child.id,
      loadedAt: Date.now(),
    }));
    return child;
  },

  setActive(id) {
    set({ activeChildId: id });
  },

  reset() {
    set({ children: [], activeChildId: null, loadedAt: undefined });
  },
}));

/** მიმდინარე ბავშვი — hook-ის სახით, რომ ეკრანებმა ლოგიკა არ გაიმეორონ. */
export function useActiveChild(): Child | null {
  const { children, activeChildId } = useChildren();
  return children.find((c) => c.id === activeChildId) ?? children[0] ?? null;
}
