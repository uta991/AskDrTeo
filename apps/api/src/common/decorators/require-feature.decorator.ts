import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * ენდპოინტი ხელმისაწვდომია მხოლოდ იმ მომხმარებლისთვის, რომლის აქტიურ
 * პაკეტში ეს ფუნქცია ჩართულია.
 *
 *   @RequireFeature('chat_with_operator')
 *   @Get('conversations')
 *   list() { ... }
 *
 * აქ პაკეტის სახელი არ ფიგურირებს — მხოლოდ ფუნქციის key.
 * რომელი პაკეტი მოიცავს ამ ფუნქციას, ბაზაში წყდება.
 */
export const RequireFeature = (featureKey: string) =>
  SetMetadata(REQUIRE_FEATURE_KEY, featureKey);
