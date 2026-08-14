import { router } from 'expo-router';

/**
 * უსაფრთხო „უკან".
 *
 * `router.back()` ცარიელ სტეკზე ვარდება — ეს ხდება deep link-ით ან
 * push-შეტყობინებიდან შესვლისას, როცა წინა ეკრანი არ არსებობს.
 * ასეთ შემთხვევაში fallback მარშრუტზე გადავდივართ.
 */
export function goBack(fallback: '/login' | '/home' = '/login'): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
