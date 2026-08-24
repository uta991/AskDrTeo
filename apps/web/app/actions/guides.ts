'use server';

import { apiMutate } from '@/lib/session';

/** ჩეკლისტის პუნქტის მონიშვნა — მდგომარეობა ბავშვის პროფილზე ინახება. */
export async function toggleChecklistItem(
  slug: string,
  itemKey: string,
  done: boolean,
): Promise<{ error?: string }> {
  try {
    await apiMutate(`/guides/${slug}/checklist`, 'PATCH', { itemKey, done });
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ვერ შევინახეთ' };
  }
}
