import { UserRole, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/**
 * გვერდების პარამეტრები.
 *
 * ცალკე DTO აუცილებელია: `@Query('page') page?: number`-ს გლობალური
 * ValidationPipe ცარიელ მნიშვნელობას NaN-ად აქცევს და ნაგულისხმევი
 * არგუმენტი აღარ ირთვება. @IsOptional + @Type ამას სწორად წყვეტს.
 */
export class PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  perPage?: number;
}

export class ListUsersQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;

  /**
   * რამდენიმე როლი ერთდროულად, მძიმით: "OPERATOR,ADMIN,SUPER_ADMIN".
   * პერსონალის სია ერთი მოთხოვნით რომ მოვიდეს — სამჯერ გამოძახება
   * იმავე შედეგს იძლეოდა, მაგრამ სამჯერ მეტი ტრაფიკით.
   */
  @IsOptional() @IsString() @MaxLength(80)
  roles?: string;

  @IsOptional() @IsEnum(UserStatus)
  status?: UserStatus;

  /** ფილტრი აქტიური პაკეტით, მაგ: "premium" */
  @IsOptional() @IsString() @MaxLength(40)
  planCode?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  perPage?: number;
}

/** პერსონალის ანგარიშის შექმნა — ოპერატორი, ადმინი ან სხვა Super Admin. */
export class CreateStaffDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  firstName!: string;

  @IsString() @IsNotEmpty() @MaxLength(50)
  lastName!: string;

  @IsEmail({}, { message: 'ელ. ფოსტა არასწორია' })
  email!: string;

  @IsOptional() @IsString()
  phone?: string;

  @Matches(PASSWORD_RE, {
    message: 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს, ასოს და ციფრს',
  })
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

/** პაროლის დაყენება ადმინის მიერ — მიმდინარე პაროლის ცოდნის გარეშე. */
export class SetPasswordDto {
  @Matches(PASSWORD_RE, {
    message: 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს, ასოს და ციფრს',
  })
  password!: string;

  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;
}

export class ChangeRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;
}

export class ChangeStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;

  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;
}

export class CancelSubscriptionDto {
  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;
}

/** გამოწერის ხელით გაცემა — გადახდის გარეშე (აქცია, კომპენსაცია, ტესტი). */
export class GrantSubscriptionDto {
  @IsString() @IsNotEmpty()
  planCode!: string;

  /** ხანგრძლივობა დღეებში — `expiresAt`-ის ალტერნატივა */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650)
  days?: number;

  /**
   * ზუსტი ვადა თარიღითა და საათით (ISO).
   * მითითების შემთხვევაში `days` იგნორირდება — ადმინს კონკრეტული
   * მომენტის დაფიქსირება უფრო ხშირად სჭირდება, ვიდრე დღეების დათვლა.
   */
  @IsOptional() @Type(() => Date) @IsDate({ message: 'ვადის თარიღი არასწორია' })
  expiresAt?: Date;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}
