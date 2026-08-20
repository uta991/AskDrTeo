import { create } from 'zustand';
import type { AssessmentResult, MilestoneAnswer, Question } from '@askdrteo/milestones';
import { api } from '@/api/client';

export type { Question, MilestoneAnswer, AssessmentResult };

interface MilestonesState {
  questions: Question[];
  loading: boolean;
  /** რომელი ასაკის კითხვები გვაქვს — ბავშვის შეცვლისას თავიდან ვტვირთავთ */
  loadedForAge?: number;
  load: (ageMonths: number) => Promise<void>;
  submit: (
    childId: string,
    ageMonths: number,
    answers: Record<string, MilestoneAnswer>,
  ) => Promise<AssessmentResult>;
}

export const useMilestones = create<MilestonesState>((set, get) => ({
  questions: [],
  loading: false,

  async load(ageMonths) {
    if (get().loadedForAge === ageMonths && get().questions.length) return;

    set({ loading: true });
    try {
      const questions = await api<Question[]>(`/milestones/questions?ageMonths=${ageMonths}`);
      set({ questions, loadedForAge: ageMonths });
    } finally {
      set({ loading: false });
    }
  },

  async submit(childId, ageMonths, answers) {
    return api<AssessmentResult>('/milestones/assessments', {
      method: 'POST',
      body: {
        childId,
        ageMonths,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      },
    });
  },
}));
