import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RequestVideoVisitDto {
  /** მშობლის არჩეული დღე — YYYY-MM-DD */
  @IsDateString({}, { message: 'აირჩიეთ ვიზიტის დღე' })
  date!: string;

  @IsOptional() @IsUUID()
  childId?: string;

  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class ScheduleVideoVisitDto {
  /** ექიმის დანიშნული ზუსტი დრო */
  @IsDateString({}, { message: 'მიუთითეთ ვიზიტის დრო' })
  scheduledAt!: string;

  @IsOptional() @IsString() @MaxLength(500)
  staffNote?: string;
}

export class CancelVideoVisitDto {
  /** მიზეზი მშობლისთვის — SMS-შიც და შეტყობინებაშიც ხვდება */
  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;
}

export class ConclusionDto {
  @IsString() @MaxLength(2000)
  diagnosis!: string;

  /** დიაგნოზის ახსნა — ცნობარიდან ავტომატურად, ექიმის რედაქტირებით */
  @IsOptional() @IsString() @MaxLength(3000)
  diagnosisNote?: string;

  @IsOptional() @IsString() @MaxLength(4000)
  prescription?: string;

  /** ვიზიტის დროინდელი გაზომვები — დოზა სწორედ მათზეა დათვლილი */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(120)
  weightKg?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) @Max(220)
  heightCm?: number;
}

/**
 * ექიმის დამატებული პრეპარატი.
 *
 * დოზირებას პროგრამა ვერ გამოიგონებს — ბავშვის დოზა შემოწმების
 * გარეშე ვერ გავრცელდება, ამიტომ მინიმალურ მონაცემებს ექიმი უთითებს.
 */
export class NewMedicationDto {
  @IsString() @MaxLength(120)
  name!: string;

  @Type(() => Number) @IsNumber() @Min(0.01)
  mgPerKgMin!: number;

  @Type(() => Number) @IsNumber() @Min(0.01)
  mgPerKgMax!: number;

  /** მიღებებს შორის ინტერვალი საათებში */
  @Type(() => Number) @IsInt() @Min(1) @Max(24)
  intervalHours!: number;

  @Type(() => Number) @IsNumber() @Min(1)
  maxDailyMg!: number;

  @IsOptional() @IsString() @MaxLength(80)
  concentrationLabel?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01)
  concentrationMg?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01)
  concentrationMl?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  minAgeMonths?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minWeightKg?: number;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}
