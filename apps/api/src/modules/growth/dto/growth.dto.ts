import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateGrowthEntryDto {
  @IsDateString({}, { message: 'მიუთითეთ გაზომვის თარიღი' })
  measuredAt!: string;

  // ზღვრები აშკარა შეცდომას იჭერს: 0.3 კგ ან 60 კგ ბავშვის წონა არ არის
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(60)
  weightKg?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) @Max(200)
  heightCm?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) @Max(70)
  headCm?: number;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}
