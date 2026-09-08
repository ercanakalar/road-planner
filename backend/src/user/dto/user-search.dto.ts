import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { emptyToUndefined } from 'src/common/dto/transforms';
import { SEARCH_TERM_MAX_LENGTH } from 'src/road/dto/road-search.dto';

export class UserSearchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(SEARCH_TERM_MAX_LENGTH)
  q?: string;
}
