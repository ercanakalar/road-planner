import { SetMetadata } from '@nestjs/common';

export const PERMISSION_METADATA_KEY = 'permission';

export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_METADATA_KEY, permission);
