/**
 * What the API accepts for a profile photo. Kept here rather than discovered by
 * uploading: a picture that is going to be refused is refused faster, and with
 * a better sentence, before it is sent over a phone connection.
 *
 * Both values mirror `backend/src/user/avatar.storage.ts`. The server sniffs
 * the bytes rather than trusting what the request claims, so this is about
 * saving a doomed upload, not about security.
 */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number];

export const DEFAULT_AVATAR_MIME: AvatarMimeType = 'image/jpeg';

/** For the sentence shown when a picture is too big. */
export const AVATAR_MAX_LABEL = '5 MB';
