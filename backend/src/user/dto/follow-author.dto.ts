import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

const asBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class FollowAuthorDto {
  @Transform(asBoolean)
  @IsBoolean()
  follow!: boolean;
}
