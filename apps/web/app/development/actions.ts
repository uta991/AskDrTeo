'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, apiMutate } from '@/lib/session';
import type { Question } from '@askdrteo/milestones';
import type { AssessmentResult, MilestoneAnswer } from '@askdrteo/milestones';

export interface AssessmentState {
  error?: string;
  result?: AssessmentResult;
}

/**
 * კითხვარის გაგზავნა.
 *
 * პასუხები `q_<id>` ველებად მოდის — ერთ ფორმაში ათეულობით კითხვაა და
 * თითოეულის ცალკე მდგომარეობაში შენახვა ზედმეტი იქნებოდა.
 */
/** ასაკის კითხვები — მშობლის მიერ მითითებულ ასაკზე. */
export async function loadQuestions(ageMonths: number): Promise<Question[]> {
  return (await apiFetch<Question[]>(`/milestones/questions?ageMonths=${ageMonths}`)) ?? [];
}

export async function submitAssessment(
  _prev: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const childId = String(formData.get('childId') ?? '');
  if (!childId) return { error: 'აირჩიეთ ბავშვის პროფილი' };

  const ageMonths = Number(formData.get('ageMonths') ?? 0);
  if (!Number.isInteger(ageMonths) || ageMonths < 0) {
    return { error: 'მიუთითეთ ბავშვის ასაკი' };
  }

  const answers: { questionId: string; answer: MilestoneAnswer }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('q_')) continue;
    answers.push({ questionId: key.slice(2), answer: String(value) as MilestoneAnswer });
  }

  if (!answers.length) return { error: 'უპასუხეთ ერთ კითხვას მაინც' };

  try {
    const result = await apiMutate<AssessmentResult>('/milestones/assessments', 'POST', {
      childId,
      ageMonths,
      answers,
    });
    revalidatePath('/development');
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'შენახვა ვერ მოხერხდა' };
  }
}
