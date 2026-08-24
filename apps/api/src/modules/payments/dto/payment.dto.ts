import { BillingInterval } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePaymentDto {
  /** გამოწერის პაკეტი — ან ეს, ან `packCode` */
  @IsOptional() @IsString() @MaxLength(50)
  planCode?: string;

  /** კონსულტაციის ლიმიტის პაკეტი — გამოწერას არ ცვლის */
  @IsOptional() @IsString() @MaxLength(50)
  packCode?: string;

  /** ვიდეო ვიზიტის დღე — ერთჯერადი შეხვედრა ექიმთან */
  @IsOptional() @IsDateString({}, { message: 'აირჩიეთ ვიზიტის დღე' })
  visitDate?: string;

  @IsOptional() @IsUUID()
  childId?: string;

  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;

  /** თვიური თუ წლიური ფასი — ერთჯერადი გადახდა გამოწერას არ ქმნის */
  @IsOptional()
  @IsEnum(BillingInterval, { message: 'პერიოდი უნდა იყოს MONTH ან YEAR' })
  interval?: 'MONTH' | 'YEAR';
}
