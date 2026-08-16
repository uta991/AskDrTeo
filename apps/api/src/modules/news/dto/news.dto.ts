import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateNewsDto {
  @IsString() @IsNotEmpty({ message: 'სათაური სავალდებულოა' }) @MaxLength(150)
  title!: string;

  @IsString() @IsNotEmpty({ message: 'ტექსტი სავალდებულოა' }) @MaxLength(5000)
  body!: string;

  @IsOptional() @IsUrl({ require_tld: false })
  coverUrl?: string;

  /** მიბმული ვიდეო — ატვირთვის შემდეგ დაბრუნებული Video.id */
  @IsOptional() @IsUUID()
  videoId?: string;

  /** false — სიახლე ჩნდება, მაგრამ შეტყობინება არ იგზავნება */
  @IsOptional() @IsBoolean()
  notify?: boolean;

  /** true — შექმნისთანავე ქვეყნდება */
  @IsOptional() @IsBoolean()
  publishNow?: boolean;

  /** როდიდან გამოჩნდეს მთავარ გვერდზე — ცარიელი ნიშნავს „მაშინვე" */
  @IsOptional() @Type(() => Date) @IsDate({ message: 'დაწყების თარიღი არასწორია' })
  visibleFrom?: Date;

  /** როდემდე ჩანდეს — ცარიელი ნიშნავს „უვადოდ" */
  @IsOptional() @Type(() => Date) @IsDate({ message: 'დასრულების თარიღი არასწორია' })
  visibleUntil?: Date;
}

export class UpdateNewsDto {
  @IsOptional() @Type(() => Date) @IsDate()
  visibleFrom?: Date;

  @IsOptional() @Type(() => Date) @IsDate()
  visibleUntil?: Date;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  title?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(5000)
  body?: string;

  @IsOptional() @IsUrl({ require_tld: false })
  coverUrl?: string;

  @IsOptional() @IsUUID()
  videoId?: string;

  @IsOptional() @IsBoolean()
  notify?: boolean;
}
