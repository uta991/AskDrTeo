'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface NewsState {
  error?: string;
  notice?: string;
}

/** ბრაუზერის პირდაპირი ატვირთვის ნებართვა — ხელმოწერა სერვერზე იქმნება. */
export interface VideoTicket {
  videoId: string;
  upload: {
    endpoint: string;
    libraryId: string;
    providerVideoId: string;
    signature: string;
    expires: number;
  };
}

/**
 * ვიდეოს ატვირთვის ნებართვა.
 *
 * ფაილი აქ არ მოდის — მხოლოდ მისი ტიპი და ზომა. server action 1MB-ზე
 * მეტს არ იღებს, ამიტომ ბაიტებს ბრაუზერი პირდაპირ Bunny-ს უგზავნის;
 * ჩვენ მხოლოდ ჩანაწერს ვქმნით და ხელს ვაწერთ.
 */
export async function requestVideoTicket(input: {
  title: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ ticket?: VideoTicket; error?: string }> {
  try {
    const ticket = await apiMutate<VideoTicket>('/media/video/ticket', 'POST', input);
    return { ticket };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ატვირთვის ნებართვა ვერ მივიღეთ' };
  }
}

/**
 * სიახლის გამოქვეყნება.
 *
 * ვიდეო ამ დროისთვის უკვე ატვირთულია ბრაუზერიდან — აქ მხოლოდ მისი
 * `videoId` მოდის. ატვირთვის ჩავარდნისას ფორმა აქამდე არ მოდის, ასე
 * რომ ნახევრად შევსებული სიახლე არ გამოქვეყნდება.
 * ვიდეო არასავალდებულოა — ტექსტიც საკმარისია.
 */
export async function createNews(_prev: NewsState, formData: FormData): Promise<NewsState> {
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const notify = formData.get('notify') === 'on';
  const visibleFrom = String(formData.get('visibleFrom') ?? '').trim();
  const visibleUntil = String(formData.get('visibleUntil') ?? '').trim();
  const videoId = String(formData.get('videoId') ?? '').trim() || undefined;

  if (!title) return { error: 'შეიყვანეთ სათაური' };
  if (!body) return { error: 'შეიყვანეთ ტექსტი' };

  try {
    const post = await apiMutate<{ publishAfterVideo?: boolean }>('/admin/news', 'POST', {
      title,
      body,
      videoId,
      notify,
      publishNow: true,
      visibleFrom: visibleFrom ? new Date(visibleFrom).toISOString() : undefined,
      // ბოლო დღე მთლიანად უნდა ჩაითვალოს — თარიღი 23:59-ზე იხურება
      visibleUntil: visibleUntil
        ? new Date(`${visibleUntil}T23:59:59`).toISOString()
        : undefined,
    });

    revalidatePath('/admin/news');

    // ვიდეოს გადაშიფვრას დრო სჭირდება — სიახლე მზადყოფნისას თავად გამოჩნდება
    if (post?.publishAfterVideo) {
      return {
        notice: 'ვიდეო მუშავდება — სიახლე დამუშავების დასრულებისთანავე გამოქვეყნდება',
      };
    }

    return { notice: notify ? 'სიახლე გამოქვეყნდა და შეტყობინება გაიგზავნა' : 'სიახლე გამოქვეყნდა' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'სიახლე ვერ გამოქვეყნდა' };
  }
}


/** სიახლის წაშლა — ლენტიდან ქრება, ჩანაწერი ისტორიისთვის რჩება. */
export async function deleteNews(_prev: NewsState, formData: FormData): Promise<NewsState> {
  const id = String(formData.get('id') ?? '');

  try {
    await apiMutate(`/admin/news/${id}`, 'DELETE');
    revalidatePath('/admin/news');
    return { notice: 'სიახლე წაშლილია' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'წაშლა ვერ მოხერხდა' };
  }
}
