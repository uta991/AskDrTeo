import { BadRequestException } from '@nestjs/common';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export type IdentifierKind = 'email' | 'phone';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** ტელეფონს ყოველთვის E.164-ში ვინახავთ. ნაგულისხმევი ქვეყანა — საქართველო. */
export function normalizePhone(input: string, defaultCountry: 'GE' = 'GE'): string {
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry);
  if (!parsed?.isValid()) {
    throw new BadRequestException('ტელეფონის ნომერი არასწორია');
  }
  return parsed.number;
}

export function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new BadRequestException('ელ. ფოსტა არასწორია');
  }
  return email;
}

/**
 * Login-ის ველი ერთია — მომხმარებელი წერს ან ელ. ფოსტას, ან ტელეფონს.
 * აქ ვწყვეტთ რომელია და ვანორმალიზებთ.
 */
export function resolveIdentifier(input: string): {
  kind: IdentifierKind;
  value: string;
} {
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    return { kind: 'email', value: normalizeEmail(trimmed) };
  }
  return { kind: 'phone', value: normalizePhone(trimmed) };
}
