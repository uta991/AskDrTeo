import { create } from 'zustand';

/**
 * მოთხოვნა ტაბის გადართვაზე.
 *
 * მთავარი ეკრანის ფილებს pager-თან პირდაპირი წვდომა არ აქვთ — ისინი
 * მის შიგნით არიან. `requested` მოთხოვნას ინახავს, `home.tsx` კი
 * უსმენს, გადადის და ასუფთავებს.
 */
interface TabsState {
  requested: string | null;
  goTo: (key: string) => void;
  clear: () => void;
}

export const useTabs = create<TabsState>((set) => ({
  requested: null,
  goTo: (key) => set({ requested: key }),
  clear: () => set({ requested: null }),
}));
