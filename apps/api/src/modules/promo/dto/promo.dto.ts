import { PromoType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePromoDto {
  @Matches(/^[A-Za-z0-9_-]{3,30}$/, {
    message: 'კოდი უნდა შეიცავდეს 3–30 ლათინურ სიმბოლოს ან ციფრს',
  })
  code!: string;

  @IsEnum(PromoType)
  type!: PromoType;

  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  /** DISCOUNT-ისთვის */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  discountPercent?: number;

  /** FREE_PLAN-ისთვის: პაკეტის code (მაგ. "premium") */
  @IsOptional() @IsString() @IsNotEmpty()
  planCode?: string;

  /** FREE_VIDEO_VISIT-ისთვის: რამდენი უფასო ვიზიტი გაიცეს (ნაგულისხმევი 1) */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10)
  visitCount?: number;

  /** რამდენი დღით გააქტიურდეს უფასო პაკეტი */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650)
  freeDays?: number;

  @IsOptional() @Type(() => Date) @IsDate()
  validFrom?: Date;

  /** კოდის მოქმედების ბოლო დღე */
  @IsOptional() @Type(() => Date) @IsDate()
  validUntil?: Date;

  /** null/გამოტოვება — ულიმიტო */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  maxRedemptions?: number;

  @IsOptional() @IsBoolean()
  oncePerUser?: boolean;
}

export class UpdatePromoDto {
  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  validUntil?: Date;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  maxRedemptions?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class RedeemPromoDto {
  @IsString() @IsNotEmpty({ message: 'შეიყვანეთ პრომო კოდი' }) @MaxLength(30)
  code!: string;
}
