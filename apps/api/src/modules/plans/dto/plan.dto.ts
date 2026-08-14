import { BillingInterval, FeatureType, PlanStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const CODE_RE = /^[a-z][a-z0-9_-]*$/;

// ─── ფუნქციები ────────────────────────────────────────────────────────────

export class CreateFeatureDto {
  @Matches(KEY_RE, { message: 'key უნდა იყოს snake_case (მაგ: chat_priority)' })
  @MaxLength(60)
  key!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsEnum(FeatureType)
  type!: FeatureType;

  @IsOptional() @IsString() @MaxLength(30)
  unit?: string;

  /** უფასო მომხმარებლის ნაგულისხმევი: BOOLEAN-ისთვის "true"/"false" */
  @IsOptional() @IsString() @MaxLength(50)
  defaultValue?: string;

  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}

export class UpdateFeatureDto {
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsString() @MaxLength(30)
  unit?: string;

  @IsOptional() @IsString() @MaxLength(50)
  defaultValue?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}

// ─── ფასები ───────────────────────────────────────────────────────────────

export class PlanPriceDto {
  @IsOptional() @IsString() @MaxLength(3)
  currency?: string;

  /** თეთრებში: 19.90 ₾ = 1990. მცურავი წერტილი ფულთან არასდროს. */
  @IsInt() @Min(0) @Max(100_000_000)
  amountMinor!: number;

  @IsEnum(BillingInterval)
  interval!: BillingInterval;

  @IsOptional() @IsInt() @Min(1) @Max(12)
  intervalCount?: number;
}

// ─── პაკეტები ─────────────────────────────────────────────────────────────

export class PlanFeatureDto {
  @IsString() @IsNotEmpty()
  featureKey!: string;

  @IsBoolean()
  enabled!: boolean;

  /** LIMIT/ACCESS-ისთვის: "3", "unlimited", "all" */
  @IsOptional() @IsString() @MaxLength(50)
  value?: string;
}

export class CreatePlanDto {
  @Matches(CODE_RE, { message: 'code უნდა იყოს ლათინური, პატარა ასოებით' })
  @MaxLength(40)
  code!: string;

  @IsString() @IsNotEmpty() @MaxLength(60)
  name!: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsBoolean()
  isFree?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(365)
  trialDays?: number;

  @IsOptional() @IsString() @MaxLength(30)
  badge?: string;

  @IsOptional() @IsHexColor()
  colorHex?: string;

  @IsOptional() @IsBoolean()
  highlight?: boolean;

  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlanPriceDto)
  prices?: PlanPriceDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlanFeatureDto)
  features?: PlanFeatureDto[];
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @MaxLength(60)
  name?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsEnum(PlanStatus)
  status?: PlanStatus;

  @IsOptional() @IsInt() @Min(0) @Max(365)
  trialDays?: number;

  @IsOptional() @IsString() @MaxLength(30)
  badge?: string;

  @IsOptional() @IsHexColor()
  colorHex?: string;

  @IsOptional() @IsBoolean()
  highlight?: boolean;

  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  /** გადმოცემის შემთხვევაში პაკეტის ფუნქციები მთლიანად ჩანაცვლდება */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlanFeatureDto)
  features?: PlanFeatureDto[];

  /** გადმოცემის შემთხვევაში ფასები მთლიანად ჩანაცვლდება */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlanPriceDto)
  prices?: PlanPriceDto[];
}
