'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate, apiUpload } from '@/lib/session';

export interface NewsState {
  error?: string;
  notice?: string;
}

/**
 * სიახლის გამოქვეყნება.
 *
 * ვიდეო ჯერ იტვირთება და მხოლოდ შემდეგ იქმნება სიახლე: ატვირთვის
 * ჩავარდნისას ნახევრად შევსებული ჩანაწერი არ უნდა გამოქვეყნდეს.
 * ვიდეო არასავალდებულოა — ტექსტიც საკმარისია.
 */
export async function createNews(_prev: NewsState, formData: FormData): Promise<NewsState> {
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const notify = formData.get('notify') === 'on';
  const visibleFrom = String(formData.get('visibleFrom') ?? '').trim();
  const visibleUntil = String(formData.get('visibleUntil') ?? '').trim();
  const video = formData.get('video');

  if (!title) return { error: 'შეიყვანეთ სათაური' };
  if (!body) return { error: 'შეიყვანეთ ტექსტი' };

  try {
    let videoId: string | undefined;

    if (video instanceof File && video.size > 0) {
      const uploaded = await apiUpload<{ videoId?: string; id?: string }>(
        '/media/video',
        video,
        { title },
      );
      videoId = uploaded.videoId ?? uploaded.id;
    }

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
