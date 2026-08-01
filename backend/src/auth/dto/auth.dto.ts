import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsJWT,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_PATTERN_MESSAGE,
} from 'src/common/dto/constants';
import { normalizeEmail, trim } from 'src/common/dto/transforms';

export class SignUpDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  confirmPassword?: string;
}

export class SignInDto {
  @Transform(trim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string;
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class ForgotPasswordDto {
  @Transform(trim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  password!: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  confirmPassword!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsJWT({ message: 'refreshToken must be a JWT' })
  refreshToken!: string;
}
