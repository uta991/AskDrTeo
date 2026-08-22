import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VideoAccessType, VideoStatus } from '@prisma/client';

export class UpdateVideoDto {
  @IsOptional() @IsString() @MaxLength(150)
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsUUID()
  categoryId?: string;

  @IsOptional() @IsEnum(VideoAccessType)
  accessType?: VideoAccessType;

  @IsOptional() @IsEnum(VideoStatus)
  status?: VideoStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(216)
  ageMinMonths?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(216)
  ageMaxMonths?: number;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;
}

export class SaveProgressDto {
  @Type(() => Number) @IsInt() @Min(0)
  positionSec!: number;
}
