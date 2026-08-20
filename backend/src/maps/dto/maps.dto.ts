import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  MinLength,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
  SHORT_TEXT_MAX_LENGTH,
} from 'src/common/dto/constants';
import { emptyToUndefined, trim } from 'src/common/dto/transforms';
import {
  PLACE_CATEGORIES,
  PlaceCategory,
  ROUTE_SEARCH_SORTS,
  RouteSearchSort,
  TRANSPORT_MODES,
  TransportMode,
} from '../types/maps.types';

export const ROUTE_WAYPOINTS_MAX = 23;

export const PLACE_QUERY_MIN_LENGTH = 2;

const asNumber = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : value;
};

const asBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class CoordinateDto {
  @Transform(asNumber)
  @IsNumber()
  @Min(LATITUDE_MIN)
  @Max(LATITUDE_MAX)
  latitude!: number;

  @Transform(asNumber)
  @IsNumber()
  @Min(LONGITUDE_MIN)
  @Max(LONGITUDE_MAX)
  longitude!: number;
}

class RouteEndpointsDto {
  @IsDefined({ message: 'origin is required' })
  @ValidateNested()
  @Type(() => CoordinateDto)
  origin!: CoordinateDto;

  @IsDefined({ message: 'destination is required' })
  @ValidateNested()
  @Type(() => CoordinateDto)
  destination!: CoordinateDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ROUTE_WAYPOINTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  waypoints?: CoordinateDto[];
}

export class DirectionsDto extends RouteEndpointsDto {
  @IsOptional()
  @IsIn(TRANSPORT_MODES)
  mode?: TransportMode;

  @IsOptional()
  @Transform(asBoolean)
  @IsBoolean()
  optimize?: boolean;
}

export class DurationsDto extends RouteEndpointsDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TRANSPORT_MODES.length)
  @IsIn(TRANSPORT_MODES, { each: true })
  modes?: TransportMode[];
}

export class ReverseGeocodeQueryDto extends CoordinateDto {}

export class RouteQueryDto {
  @IsOptional()
  @IsIn(TRANSPORT_MODES)
  mode?: TransportMode;
}

export class DurationsQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((mode) => mode.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TRANSPORT_MODES.length)
  @IsIn(TRANSPORT_MODES, { each: true })
  modes?: TransportMode[];
}

export class PlaceSearchQueryDto {
  @Transform(trim)
  @IsString()
  @MinLength(PLACE_QUERY_MIN_LENGTH)
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  input!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  sessionToken?: string;
}

export class PlaceDetailsQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  sessionToken?: string;
}

export const ROUTE_SEARCH_RADIUS_MIN = 100;
export const ROUTE_SEARCH_RADIUS_MAX = 25_000;
export const ROUTE_SEARCH_RADIUS_DEFAULT = 2000;

export const ROUTE_SEARCH_LIMIT_MAX = 60;
export const ROUTE_SEARCH_LIMIT_DEFAULT = 20;

export const ROUTE_SEARCH_SORT_DEFAULT: RouteSearchSort = 'detour';

export const ROUTE_SEARCH_QUERY_MIN_LENGTH = 2;

export const RATING_MIN = 0;
export const RATING_MAX = 5;

@ValidatorConstraint({ name: 'searchTerm', async: false })
class SearchTermConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const { category } = args.object as RouteSearchDto;

    if (value === undefined || value === null) return category !== undefined;

    return (
      typeof value === 'string' &&
      value.length >= ROUTE_SEARCH_QUERY_MIN_LENGTH &&
      value.length <= SHORT_TEXT_MAX_LENGTH
    );
  }

  defaultMessage({ value }: ValidationArguments): string {
    if (value === undefined || value === null) {
      return 'give a query, a category, or both to search for';
    }

    return `query must be between ${ROUTE_SEARCH_QUERY_MIN_LENGTH} and ${SHORT_TEXT_MAX_LENGTH} characters`;
  }
}

export class RouteSearchDto extends RouteEndpointsDto {
  @IsOptional()
  @IsIn(TRANSPORT_MODES)
  mode?: TransportMode;

  @Validate(SearchTermConstraint)
  @Transform(emptyToUndefined)
  query?: string;

  @IsOptional()
  @IsIn(PLACE_CATEGORIES)
  category?: PlaceCategory;

  @IsOptional()
  @Transform(asNumber)
  @IsNumber()
  @Min(ROUTE_SEARCH_RADIUS_MIN)
  @Max(ROUTE_SEARCH_RADIUS_MAX)
  radiusMeters?: number;

  @IsOptional()
  @Transform(asBoolean)
  @IsBoolean()
  openNow?: boolean;

  @IsOptional()
  @Transform(asNumber)
  @IsNumber()
  @Min(RATING_MIN)
  @Max(RATING_MAX)
  minRating?: number;

  @IsOptional()
  @Transform(asNumber)
  @IsInt()
  @Min(1)
  @Max(ROUTE_SEARCH_LIMIT_MAX)
  limit?: number;

  @IsOptional()
  @IsIn(ROUTE_SEARCH_SORTS)
  sortBy?: RouteSearchSort;
}
