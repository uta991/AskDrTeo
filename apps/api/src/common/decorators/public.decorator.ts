import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** ენდპოინტი ავტორიზაციის გარეშე ხელმისაწვდომია. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
