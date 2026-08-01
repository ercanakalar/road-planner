import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  SHORT_TEXT_MAX_LENGTH,
  URL_MAX_LENGTH,
} from 'src/common/dto/constants';
import { emptyToUndefined } from 'src/common/dto/transforms';

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
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'nickName may contain only letters, numbers, dots, underscores and hyphens',
  })
  nickName?: string;
}
