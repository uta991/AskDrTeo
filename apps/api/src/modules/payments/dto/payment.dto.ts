import { BillingInterval } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @IsString() @MaxLength(50)
  planCode!: string;

  /** თვიური თუ წლიური ფასი — ერთჯერადი გადახდა გამოწერას არ ქმნის */
  @IsOptional()
  @IsEnum(BillingInterval, { message: 'პერიოდი უნდა იყოს MONTH ან YEAR' })
  interval?: 'MONTH' | 'YEAR';
}
