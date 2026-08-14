import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  dictionaries,
  LANGUAGES,
  type LanguageCode,
  type Translations,
} from './translations';

export { LANGUAGES, type LanguageCode };

const STORAGE_KEY = 'app_language';

interface LanguageState {
  language: LanguageCode;
  /** true სანამ შენახული არჩევანი იტვირთება — თავიდან ციმციმს ვთავიდან ვიცილებთ */
  hydrated: boolean;
  restore: () => Promise<void>;
  setLanguage: (code: LanguageCode) => void;
}

export const useLanguage = create<LanguageState>((set) => ({
  language: 'ka',
  hydrated: false,

  async restore() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && saved in dictionaries) {
        set({ language: saved as LanguageCode });
      }
    } finally {
      set({ hydrated: true });
    }
  },

  setLanguage(code) {
    set({ language: code });
    // ჩაწერა ფონურია — ინტერფეისმა დაყოვნება არ უნდა იგრძნოს
    void AsyncStorage.setItem(STORAGE_KEY, code);
  },
}));

/**
 * `{{name}}` სტილის ჩანაცვლებები.
 * არსებული key-ის გარეშე დარჩენილი placeholder ტექსტში რჩება — ეს
 * განზრახაა, რომ გამორჩენა თვალსაჩინო იყოს.
 */
function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

type Section = keyof Translations;

/**
 * თარგმანების hook.
 *
 *   const t = useT();
 *   t('auth', 'signIn')
 *   t('home', 'greeting', { name: 'ნინო' })
 */
export function useT() {
  const language = useLanguage((s) => s.language);
  const dict = dictionaries[language];

  return <S extends Section>(
    section: S,
    key: keyof Translations[S],
    vars?: Record<string, string | number>,
  ): string => {
    const value = (dict[section] as Record<string, string>)[key as string];
    return interpolate(value ?? String(key), vars);
  };
}
