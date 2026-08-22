'use server';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export interface FeedbackInfo {
  token: string;
  rating: number | null;
  comment: string | null;
  ratedAt: string | null;
  operator: { firstName: string } | null;
}

export interface FeedbackState {
  error?: string;
  done?: boolean;
}

/**
 * შეფასების წამოღება.
 *
 * ავტორიზაციის გარეშე მიდის — ბმულს ერთჯერადი token იცავს, სესია კი
 * SMS-ის მიმღებს ხშირად არ აქვს.
 */
export async function loadFeedback(token: string): Promise<FeedbackInfo | null> {
  try {
    const res = await fetch(`${API_URL}/feedback/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as FeedbackInfo;
  } catch {
    return null;
  }
}

export async function submitFeedback(
  token: string,
  rating: number,
  comment: string,
): Promise<FeedbackState> {
  try {
    const res = await fetch(`${API_URL}/feedback/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      return { error: payload?.message ?? 'შეფასება ვერ შეინახა' };
    }

    return { done: true };
  } catch {
    return { error: 'შეფასება ვერ შეინახა' };
  }
}
