export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number];

export const DEFAULT_AVATAR_MIME: AvatarMimeType = 'image/jpeg';

export const AVATAR_MAX_LABEL = '5 MB';
