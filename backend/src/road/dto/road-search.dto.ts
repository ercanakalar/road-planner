import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { emptyToUndefined } from 'src/common/dto/transforms';

export const ROAD_SEARCH_SORTS = [
  'recent',
  'oldest',
  'popular',
  'stops',
  'title',
] as const;

export type RoadSearchSort = (typeof ROAD_SEARCH_SORTS)[number];

export const DEFAULT_ROAD_SEARCH_SORT: RoadSearchSort = 'recent';

export const MIN_SEARCH_TERM_LENGTH = 2;

export const SEARCH_TERM_MAX_LENGTH = 120;

export const STOP_FILTER_MAX = 100;

const asOptionalInteger = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;
  if (value.trim() === '') return undefined;

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
};

export class RoadSearchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(SEARCH_TERM_MAX_LENGTH)
  q?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(ROAD_SEARCH_SORTS)
  sort?: RoadSearchSort;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @Transform(asOptionalInteger)
  @IsInt()
  @Min(0)
  @Max(STOP_FILTER_MAX)
  minStops?: number;

  @IsOptional()
  @Transform(asOptionalInteger)
  @IsInt()
  @Min(0)
  @Max(STOP_FILTER_MAX)
  maxStops?: number;
}
