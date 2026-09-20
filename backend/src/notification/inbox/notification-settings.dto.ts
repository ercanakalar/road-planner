import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

const asBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

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
