import { apiFetch } from './session';

export interface ChildSummary {
  id: string;
  firstName: string;
  lastName: string | null;
  birthDate: string;
  ageLabel: string;
  stage: string;
  isPreterm: boolean;
  correctedAgeMonths: number;
}

/** მშობლის ბავშვები — რამდენიმე გვერდს სჭირდება, ერთ ადგილას ვინახავთ. */
export function getChildren(): Promise<ChildSummary[] | null> {
  return apiFetch<ChildSummary[]>('/children');
}
