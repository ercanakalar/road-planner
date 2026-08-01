import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 50;

export const MAX_PAGE_SIZE = 200;

const asInteger =
  (fallback: number) =>
  ({ value }: { value: unknown }): unknown => {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return value;
    if (value.trim() === '') return fallback;

    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : value;
  };

export class PaginationQueryDto {
  @Transform(asInteger(DEFAULT_PAGE_SIZE))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @Transform(asInteger(0))
  @IsInt()
  @Min(0)
  offset: number = 0;
}

export interface PageMeta {
  [key: string]: number | boolean;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function pageMeta(
  total: number,
  { limit, offset }: PaginationQueryDto,
): PageMeta {
  return { total, limit, offset, hasMore: offset + limit < total };
}
