import { Gender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateChildDto {
  @IsString() @IsNotEmpty({ message: 'შეიყვანეთ ბავშვის სახელი' }) @MaxLength(50)
  firstName!: string;

  @IsOptional() @IsString() @MaxLength(50)
  lastName?: string;

  @Type(() => Date)
  @IsDate({ message: 'დაბადების თარიღი არასწორია' })
  birthDate!: Date;

  @IsOptional() @IsEnum(Gender)
  gender?: Gender;

  /** ატვირთული ფაილის id — `/media/avatar` აბრუნებს */
  @IsOptional() @IsUUID()
  avatarAssetId?: string;

  /** ორსულობის კვირა დაბადებისას — 22-დან 45-მდე მედიცინურად რეალურია */
  @IsOptional() @Type(() => Number) @IsInt() @Min(22) @Max(45)
  gestationalWeek?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.3) @Max(30)
  birthWeight?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) @Max(150)
  birthHeight?: number;

  @IsOptional() @IsString() @MaxLength(50)
  motherFirstName?: string;

  @IsOptional() @IsString() @MaxLength(50)
  motherLastName?: string;

  @IsOptional() @Type(() => Date) @IsDate({ message: 'დედის დაბადების თარიღი არასწორია' })
  motherBirthDate?: Date;

  @IsOptional() @IsString() @MaxLength(50)
  fatherFirstName?: string;

  @IsOptional() @IsString() @MaxLength(50)
  fatherLastName?: string;

  @IsOptional() @Type(() => Date) @IsDate({ message: 'მამის დაბადების თარიღი არასწორია' })
  fatherBirthDate?: Date;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}

export class UpdateChildDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(50)
  firstName?: string;

  @IsOptional() @IsString() @MaxLength(50)
  lastName?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  birthDate?: Date;

  @IsOptional() @Type(() => Number) @IsInt() @Min(22) @Max(45)
  gestationalWeek?: number;

  @IsOptional() @IsString() @MaxLength(50)
  motherFirstName?: string;

  @IsOptional() @IsString() @MaxLength(50)
  motherLastName?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  motherBirthDate?: Date;

  @IsOptional() @IsString() @MaxLength(50)
  fatherFirstName?: string;

  @IsOptional() @IsString() @MaxLength(50)
  fatherLastName?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  fatherBirthDate?: Date;

  @IsOptional() @IsEnum(Gender)
  gender?: Gender;

  /** ატვირთული ფაილის id — `/media/avatar` აბრუნებს */
  @IsOptional() @IsUUID()
  avatarAssetId?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.3) @Max(30)
  birthWeight?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) @Max(150)
  birthHeight?: number;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}
