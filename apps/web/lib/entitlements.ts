import { apiFetch } from './session';

export interface Entitlement {
  key: string;
  name: string;
  type: 'BOOLEAN' | 'LIMIT' | 'ACCESS';
  enabled: boolean;
  value: string | null;
  unit: string | null;
}

export interface Entitlements {
  planCode: string | null;
  planName: string | null;
  periodEnd: string | null;
  features: Record<string, Entitlement>;
}

export const PLAN_LABELS: Record<string, string> = {
  free: 'უფასო',
  standard: 'სტანდარტული',
  premium: 'პრემიუმი',
};

export function getEntitlements(): Promise<Entitlements | null> {
  return apiFetch<Entitlements>('/me/entitlements');
}

/**
 * ფუნქცია პაკეტში შედის თუ არა.
 *
 * პერსონალს გამოწერა არ სჭირდება — ისინი სისტემას ემსახურებიან და
 * სერვერზეც იმავე წესით გვერდდებიან.
 */
export function can(
  entitlements: Entitlements | null,
  featureKey: string,
  role?: string,
): boolean {
  if (role && role !== 'PARENT') return true;
  return entitlements?.features[featureKey]?.enabled ?? false;
}
