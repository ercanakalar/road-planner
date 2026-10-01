import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { asInteger } from 'src/common/dto/pagination.dto';
import {
  CLIENT_USAGE_EVENTS,
  ClientUsageEvent,
  USAGE_DETAIL_PATTERN,
} from '../usage-events';

export const REPORT_MAX_EVENTS = 20;

export const OVERVIEW_DEFAULT_DAYS = 30;
export const OVERVIEW_MAX_DAYS = 365;

export class ReportedUsageDto {
  @IsIn([...CLIENT_USAGE_EVENTS])
  name!: ClientUsageEvent;

  @IsOptional()
  @IsString()
  @Matches(USAGE_DETAIL_PATTERN)
  detail?: string;
}

export class ReportUsageDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(REPORT_MAX_EVENTS)
  @ValidateNested({ each: true })
  @Type(() => ReportedUsageDto)
  events!: ReportedUsageDto[];
}

export class OverviewQueryDto {
  @Transform(asInteger(OVERVIEW_DEFAULT_DAYS))
  @IsInt()
  @Min(1)
  @Max(OVERVIEW_MAX_DAYS)
  days: number = OVERVIEW_DEFAULT_DAYS;
}
