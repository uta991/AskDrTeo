import { OtpPurpose } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

// მინიმუმ 8 სიმბოლო, ერთი ასო და ერთი ციფრი
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_MSG = 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს, ასოს და ციფრს';

export class RegisterDto {
  @IsString() @IsNotEmpty({ message: 'სახელი სავალდებულოა' }) @MaxLength(50)
  firstName!: string;

  @IsString() @IsNotEmpty({ message: 'გვარი სავალდებულოა' }) @MaxLength(50)
  lastName!: string;

  @IsEmail({}, { message: 'ელ. ფოსტა არასწორია' })
  email!: string;

  @IsString() @IsNotEmpty({ message: 'ტელეფონი სავალდებულოა' })
  phone!: string;

  @Matches(PASSWORD_RE, { message: PASSWORD_MSG })
  password!: string;

  @IsBoolean()
  acceptedTerms!: boolean;

  @IsOptional() @IsString()
  deviceId?: string;
}

export class LoginDto {
  /** ელ. ფოსტა ან ტელეფონი — ერთი ველი, როგორც დიზაინშია. */
  @IsString() @IsNotEmpty({ message: 'შეიყვანეთ ელ. ფოსტა ან ტელეფონი' })
  identifier!: string;

  @IsString() @IsNotEmpty({ message: 'შეიყვანეთ პაროლი' })
  password!: string;

  @IsOptional() @IsString()
  deviceId?: string;
}

export class VerifyOtpDto {
  @IsString() @IsNotEmpty()
  destination!: string;

  @IsString() @Length(4, 8, { message: 'კოდი არასწორია' })
  code!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}

export class ResendOtpDto {
  @IsString() @IsNotEmpty()
  destination!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}

export class RefreshDto {
  @IsString() @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsString() @IsNotEmpty()
  identifier!: string;
}

export class ResetPasswordDto {
  @IsString() @IsNotEmpty()
  destination!: string;

  @IsString() @Length(4, 8)
  code!: string;

  @Matches(PASSWORD_RE, { message: PASSWORD_MSG })
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword!: string;

  @Matches(PASSWORD_RE, { message: PASSWORD_MSG })
  newPassword!: string;
}

export class GoogleAuthDto {
  @IsString() @IsNotEmpty()
  idToken!: string;

  @IsOptional() @IsString()
  deviceId?: string;
}

export class AppleAuthDto {
  @IsString() @IsNotEmpty()
  identityToken!: string;

  /**
   * Apple სახელს მხოლოდ *პირველი* ავტორიზაციისას გვიბრუნებს და მხოლოდ
   * კლიენტს — ტოკენში ის არ არის. ამიტომ აპლიკაცია ცალკე გვიგზავნის.
   * არასანდო მონაცემია: გამოიყენება მხოლოდ ახალი ანგარიშის შესაქმნელად.
   */
  @IsOptional() @IsString() @MaxLength(50)
  firstName?: string;

  @IsOptional() @IsString() @MaxLength(50)
  lastName?: string;

  @IsOptional() @IsString()
  deviceId?: string;
}
