import {
  IsBoolean,
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
}

export class UpdateNewsDto {
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
