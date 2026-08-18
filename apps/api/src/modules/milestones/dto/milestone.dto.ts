import { MilestoneAnswer, MilestoneDomain } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AgeQueryDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(216)
  ageMonths!: number;
}

export class AnswerDto {
  @IsUUID()
  questionId!: string;

  @IsEnum(MilestoneAnswer)
  answer!: MilestoneAnswer;
}

export class SubmitAssessmentDto {
  @IsUUID()
  childId!: string;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => AnswerDto)
  answers!: AnswerDto[];
}

export class CreateQuestionDto {
  @Matches(/^[A-Z]{2}_\d{2}_\d{2}$/, { message: 'კოდის ფორმატი: GM_06_01' })
  code!: string;

  @Type(() => Number) @IsInt() @Min(0) @Max(216)
  ageMonths!: number;

  @IsEnum(MilestoneDomain)
  domain!: MilestoneDomain;

  @IsString() @IsNotEmpty({ message: 'კითხვა სავალდებულოა' }) @MaxLength(300)
  questionKa!: string;

  @IsOptional() @IsBoolean()
  redFlag?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
