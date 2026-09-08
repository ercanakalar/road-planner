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

/** How a page of search results is ordered. */
export const ROAD_SEARCH_SORTS = [
  'recent',
  'oldest',
  'popular',
  'stops',
  'title',
] as const;

export type RoadSearchSort = (typeof ROAD_SEARCH_SORTS)[number];

export const DEFAULT_ROAD_SEARCH_SORT: RoadSearchSort = 'recent';

/**
 * Two characters is the shortest term worth a table scan; below that every
 * public route matches and the result is just the feed with extra steps.
 */
export const MIN_SEARCH_TERM_LENGTH = 2;

export const SEARCH_TERM_MAX_LENGTH = 120;

/** Nobody filters for a route with more stops than this. */
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
  /** Matched against the title, the description and the author's name. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(SEARCH_TERM_MAX_LENGTH)
  q?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(ROAD_SEARCH_SORTS)
  sort?: RoadSearchSort;

  /** Narrows to one author, which is what tapping a person in search does. */
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
