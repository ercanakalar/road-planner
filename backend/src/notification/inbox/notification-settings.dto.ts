import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

const asBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

/**
 * Where somebody wants to hear about what they follow.
 *
 * Both optional, and each written only when it is present: the settings screen
 * sends one switch at a time, and a missing field must leave the other alone
 * rather than resetting it to a default.
 */
export class NotificationSettingsDto {
  @IsOptional()
  @Transform(asBoolean)
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @Transform(asBoolean)
  @IsBoolean()
  email?: boolean;
}
