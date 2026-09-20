import { File } from 'expo-file-system';

import { AVATAR_MAX_BYTES } from 'constants/avatar';

export interface PickedPhoto {
  uri: string;
}

export interface PickedAsset {
  uri: string;
  fileSize?: number | null;
}

export function toUploadPart(photo: PickedPhoto): Blob {
  return new File(photo.uri) as unknown as Blob;
}

export function isPhotoTooLarge(size?: number | null): boolean {
  return typeof size === 'number' && size > AVATAR_MAX_BYTES;
}
