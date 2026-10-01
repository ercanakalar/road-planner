import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
  NICKNAME_PATTERN_MESSAGE,
  SHORT_TEXT_MAX_LENGTH,
  URL_MAX_LENGTH,
} from 'src/common/dto/constants';
import { emptyToUndefined } from 'src/common/dto/transforms';
import { SUPPORTED_LANGUAGES } from 'src/i18n/languages';

export class UpdateUserDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  firstName?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  lastName?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(URL_MAX_LENGTH)
  photo?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(NICKNAME_MIN_LENGTH)
  @MaxLength(NICKNAME_MAX_LENGTH)
  @Matches(NICKNAME_PATTERN, { message: NICKNAME_PATTERN_MESSAGE })
  nickName?: string;

  @IsOptional()
  @IsIn([...SUPPORTED_LANGUAGES])
  language?: string;
}

export class NicknameAvailabilityQueryDto {
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(NICKNAME_MIN_LENGTH)
  @MaxLength(NICKNAME_MAX_LENGTH)
  @Matches(NICKNAME_PATTERN, { message: NICKNAME_PATTERN_MESSAGE })
  nickName!: string;
}
