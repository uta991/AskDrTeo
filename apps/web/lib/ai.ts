import { apiFetchPublic } from './session';

/**
 * AI ასისტენტი ჩართულია თუ არა.
 *
 * ასისტენტი დროებით დაპაუზებულია. გადამრთველი სერვერზეა
 * (`AI_ASSISTANT_ENABLED`), რომ საიტიც და აპლიკაციაც ერთსა და იმავეს
 * ეკითხებოდნენ — დაბრუნება ცვლადის შეცვლაა, კოდის გარეშე.
 */
export async function aiAssistantEnabled(): Promise<boolean> {
  const health = await apiFetchPublic<{ enabled: boolean }>('/ai/health');
  return health?.enabled ?? false;
}
