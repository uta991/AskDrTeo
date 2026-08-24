import type { Guide } from '../types';
import { EMERGENCY_GUIDE } from './emergency';
import { NEWBORN_GUIDE } from './newborn';
import { NUTRITION_GUIDE } from './nutrition';
import { SLEEP_GUIDE } from './sleep';
import { TRAVEL_GUIDE } from './travel';

/** გზამკვლევები slug-ის მიხედვით — მისამართიდან პირდაპირ იძებნება. */
export const GUIDES: Record<string, Guide> = {
  [EMERGENCY_GUIDE.slug]: EMERGENCY_GUIDE,
  [NEWBORN_GUIDE.slug]: NEWBORN_GUIDE,
  [TRAVEL_GUIDE.slug]: TRAVEL_GUIDE,
  [NUTRITION_GUIDE.slug]: NUTRITION_GUIDE,
  [SLEEP_GUIDE.slug]: SLEEP_GUIDE,
};
