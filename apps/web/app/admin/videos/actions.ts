'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate } from '@/lib/session';

export interface AdminVideo {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PROCESSING' | 'PUBLISHED' | 'ARCHIVED';
  accessType: 'FREE' | 'AUTHENTICATED' | 'SUBSCRIPTION' | 'SPECIFIC_PLANS';
  category: { id: string; slug: string; name: string } | null;
  createdAt: string;
}

export interface VideoState {
  error?: string;
  notice?: string;
}

/** წვდომის წესი და გამოქვეყნება — ერთი ფორმიდან. */
export async function updateVideo(_prev: VideoState, formData: FormData): Promise<VideoState> {
  const id = String(formData.get('id') ?? '');
  const accessType = String(formData.get('accessType') ?? '') || undefined;
  const status = String(formData.get('status') ?? '') || undefined;

  try {
    await apiMutate(`/admin/videos/${id}`, 'PATCH', { accessType, status });
    revalidatePath('/admin/videos');
    return { notice: 'შენახულია' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა' };
  }
}

export async function deleteVideo(_prev: VideoState, formData: FormData): Promise<VideoState> {
  const id = String(formData.get('id') ?? '');

  try {
    await apiMutate(`/admin/videos/${id}`, 'DELETE');
    revalidatePath('/admin/videos');
    return { notice: 'ვიდეო წაშლილია' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'წაშლა ვერ მოხერხდა' };
  }
}
