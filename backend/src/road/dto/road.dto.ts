import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
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

export class AddressInputDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  country?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  province?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  district?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  address!: string;
}

export class RequiredAddressInputDto extends AddressInputDto {}

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
  @ValidateNested()
  @Type(() => AddressInputDto)
  address?: AddressInputDto;

  @IsOptional()
  @IsUUID()
  addressInfoId?: string;
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

export class UpdateRoadDto extends CreateRoadDto {}

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

  @IsDefined({ message: 'address is required' })
  @ValidateNested()
  @Type(() => RequiredAddressInputDto)
  address!: RequiredAddressInputDto;
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

  @IsDefined({ message: 'address is required' })
  @ValidateNested()
  @Type(() => RequiredAddressInputDto)
  address!: RequiredAddressInputDto;
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
