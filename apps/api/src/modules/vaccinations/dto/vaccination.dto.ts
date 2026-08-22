import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class MarkVaccinationDto {
  /** გაკეთების თარიღი; ცარიელი = ჯერ არ გაკეთებულა */
  @IsOptional() @IsDateString()
  doneAt?: string;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class CreateVaccineDto {
  @IsString() @IsNotEmpty() @MaxLength(40)
  code!: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  name!: string;

  @IsOptional() @IsString() @MaxLength(400)
  description?: string;

  @Type(() => Number) @IsInt() @Min(0) @Max(216)
  ageMonths!: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10)
  doseNumber?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class SaveHistoryDto {
  /** რომელი აცრები აქვს უკვე გაკეთებული — დანარჩენი დარჩენილად ითვლება */
  @IsArray()
  @IsUUID('4', { each: true })
  doneVaccineIds!: string[];
}
