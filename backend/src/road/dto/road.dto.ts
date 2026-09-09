import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
  LONG_TEXT_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
  STOPS_MAX,
} from 'src/common/dto/constants';
import { trim } from 'src/common/dto/transforms';
import { TRANSPORT_MODES, TransportMode } from 'src/maps/types/maps.types';

export class StopInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNumber()
  @Min(LATITUDE_MIN)
  @Max(LATITUDE_MAX)
  latitude!: number;

  @IsNumber()
  @Min(LONGITUDE_MIN)
  @Max(LONGITUDE_MAX)
  longitude!: number;

  @IsInt()
  @Min(0)
  order!: number;

  @IsOptional()
  @IsIn(['start', 'end', 'stop'])
  type?: 'start' | 'end' | 'stop';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  address?: string;
}

/** A point on a route that has not been saved, so has no id to look up. */
export class TerrainPointDto {
  @IsNumber()
  @Min(LATITUDE_MIN)
  @Max(LATITUDE_MAX)
  latitude!: number;

  @IsNumber()
  @Min(LONGITUDE_MIN)
  @Max(LONGITUDE_MAX)
  longitude!: number;
}

/**
 * Measure the road running through these points, in the order given.
 *
 * The saved-route reading is `GET /road/:id/terrain`; this is the same reading
 * for a route still being built on the map, which has no id yet. Capped at the
 * same number of stops a road may hold, since it costs the same one directions
 * call and one elevation call.
 */
export class TerrainStopsDto {
  @IsArray()
  @ArrayMaxSize(STOPS_MAX)
  @ValidateNested({ each: true })
  @Type(() => TerrainPointDto)
  stops!: TerrainPointDto[];

  @IsOptional()
  @IsIn(TRANSPORT_MODES)
  mode?: TransportMode;
}

export class CreateRoadDto {
  @Transform(trim)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  title!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  description!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(STOPS_MAX)
  @ValidateNested({ each: true })
  @Type(() => StopInputDto)
  stops?: StopInputDto[];
}

export class UpdateRoadDto extends CreateRoadDto {
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class AddStopDto {
  @IsNumber()
  @Min(LATITUDE_MIN)
  @Max(LATITUDE_MAX)
  latitude!: number;

  @IsNumber()
  @Min(LONGITUDE_MIN)
  @Max(LONGITUDE_MAX)
  longitude!: number;

  @IsInt()
  @Min(0)
  order!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  address?: string;
}

export class UpdateStopDto {
  @IsNumber()
  @Min(LATITUDE_MIN)
  @Max(LATITUDE_MAX)
  latitude!: number;

  @IsNumber()
  @Min(LONGITUDE_MIN)
  @Max(LONGITUDE_MAX)
  longitude!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  address?: string;
}

export class ReorderStopsDto {
  @IsOptional()
  @IsUUID()
  roadId?: string;

  @IsInt()
  @Min(0)
  from!: number;

  @IsInt()
  @Min(0)
  to!: number;
}
