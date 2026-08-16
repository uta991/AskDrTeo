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

    await apiMutate('/admin/news', 'POST', {
      title,
      body,
      videoId,
      notify,
      publishNow: true,
    });

    revalidatePath('/admin/news');
    return { notice: notify ? 'სიახლე გამოქვეყნდა და შეტყობინება გაიგზავნა' : 'სიახლე გამოქვეყნდა' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'სიახლე ვერ გამოქვეყნდა' };
  }
}
