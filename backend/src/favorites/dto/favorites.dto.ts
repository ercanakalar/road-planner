import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import {
  LONG_TEXT_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
} from 'src/common/dto/constants';
import { trim } from 'src/common/dto/transforms';

export class ToggleFavoriteWaypointDto {
  @IsUUID('4', { message: 'waypointId must be a UUID' })
  waypointId!: string;
}

export class ToggleFavoriteRoadDto {
  @IsUUID('4', { message: 'roadId must be a UUID' })
  roadId!: string;
}

export class UpdateFavoriteAnnotationDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  description?: string;
}
