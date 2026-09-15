import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

const asBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

/**
 * Which way the follow switch was moved.
 *
 * Stated rather than toggled server-side: the button knows what it is showing,
 * and a toggle would flip the wrong way whenever the row on screen is a moment
 * behind the row in the database.
 */
export class FollowAuthorDto {
  @Transform(asBoolean)
  @IsBoolean()
  follow!: boolean;
}
