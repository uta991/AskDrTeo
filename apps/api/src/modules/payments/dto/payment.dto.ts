import { BillingInterval } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  /** გამოწერის პაკეტი — ან ეს, ან `packCode` */
  @IsOptional() @IsString() @MaxLength(50)
  planCode?: string;

  /** კონსულტაციის ლიმიტის პაკეტი — გამოწერას არ ცვლის */
  @IsOptional() @IsString() @MaxLength(50)
  packCode?: string;

  /** თვიური თუ წლიური ფასი — ერთჯერადი გადახდა გამოწერას არ ქმნის */
  @IsOptional()
  @IsEnum(BillingInterval, { message: 'პერიოდი უნდა იყოს MONTH ან YEAR' })
  interval?: 'MONTH' | 'YEAR';
}
