import { MedicationDosingType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConcentrationDto {
  @IsString() @IsNotEmpty({ message: 'კონცენტრაციის აღწერა სავალდებულოა' }) @MaxLength(80)
  label!: string;

  @Type(() => Number) @IsNumber() @Min(0.001)
  mg!: number;

  @Type(() => Number) @IsNumber() @Min(0.001)
  ml!: number;
}

export class AgeBandDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(300)
  untilMonths!: number;

  @Type(() => Number) @IsNumber() @Min(0.001)
  mg!: number;

  @IsString() @IsNotEmpty() @MaxLength(60)
  label!: string;
}

export class CreateMedicationDto {
  @IsString() @IsNotEmpty({ message: 'წამლის სახელი სავალდებულოა' }) @MaxLength(80)
  name!: string;

  @Matches(/^[a-z0-9-]{2,40}$/, { message: 'იდენტიფიკატორი: ლათინური ასოები, ციფრები და ტირე' })
  slug!: string;

  @IsEnum(MedicationDosingType)
  dosingType!: MedicationDosingType;

  /** PER_KG-ისთვის */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.0001)
  mgPerKgMin?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.0001)
  mgPerKgMax?: number;

  /** BY_AGE-ისთვის */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AgeBandDto)
  ageBands?: AgeBandDto[];

  @Type(() => Number) @IsInt() @Min(1) @Max(72)
  intervalHoursMin!: number;

  @Type(() => Number) @IsInt() @Min(1) @Max(72)
  intervalHoursMax!: number;

  @Type(() => Number) @IsNumber() @Min(0.001)
  maxDailyMg!: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(300)
  minAgeMonths?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(150)
  minWeightKg?: number;

  @IsArray() @ValidateNested({ each: true }) @Type(() => ConcentrationDto)
  concentrations!: ConcentrationDto[];

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  sortOrder?: number;
}

export class UpdateMedicationDto extends CreateMedicationDto {
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
