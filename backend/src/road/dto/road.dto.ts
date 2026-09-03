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
  WAYPOINTS_MAX,
} from 'src/common/dto/constants';
import { trim } from 'src/common/dto/transforms';

export class WaypointInputDto {
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
  @IsIn(['start', 'end', 'waypoint'])
  type?: 'start' | 'end' | 'waypoint';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  address?: string;
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
  @ArrayMaxSize(WAYPOINTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => WaypointInputDto)
  waypoints?: WaypointInputDto[];
}

export class UpdateRoadDto extends CreateRoadDto {
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class AddWaypointDto {
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

export class UpdateWaypointDto {
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

export class ReorderWaypointsDto {
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
