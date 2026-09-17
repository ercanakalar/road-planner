import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, normalize, resolve } from 'path';

const logger = new Logger('AvatarStorage');

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * What Multer is allowed to buffer before it gives up, as opposed to what this
 * service will store.
 *
 * Deliberately above AVATAR_MAX_BYTES rather than equal to it. Multer's own
 * refusal is a `MulterError` that Nest turns into `PayloadTooLarge("File too
 * large")` before any of our code sees it, and that sentence does not say what
 * the limit is — so a photo a little over the line got the least useful message
 * of the two. Leaving Multer a margin means the realistic overshoot, a phone
 * photo of six or seven megabytes, is refused by `writeAvatar` below with a
 * sentence that names the limit, while Multer still stops an upload that is
 * only trying to exhaust memory.
 */
export const AVATAR_UPLOAD_CEILING_BYTES = AVATAR_MAX_BYTES * 2;

const TYPES: { mime: string; extension: string; magic: number[] }[] = [
  { mime: 'image/jpeg', extension: 'jpg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', extension: 'png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', extension: 'webp', magic: [0x52, 0x49, 0x46, 0x46] },
];

export const AVATAR_FILENAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

const sniff = (buffer: Buffer) =>
  TYPES.find((type) =>
    type.magic.every((byte, index) => buffer[index] === byte),
  );

export const avatarDirectory = (uploadDir: string) =>
  resolve(process.cwd(), uploadDir, 'avatars');

export const avatarPath = (uploadDir: string, filename: string) => {
  if (!AVATAR_FILENAME.test(filename)) return null;

  const directory = avatarDirectory(uploadDir);
  const path = join(directory, normalize(filename));

  return path.startsWith(directory) ? path : null;
};

export async function writeAvatar(
  uploadDir: string,
  buffer: Buffer,
): Promise<string> {
  if (!buffer?.length) {
    throw new BadRequestException('error.imageRequired');
  }
  if (buffer.length > AVATAR_MAX_BYTES) {
    throw new BadRequestException('error.imageTooLarge');
  }

  const type = sniff(buffer);
  if (!type) {
    throw new BadRequestException('error.imageWrongType');
  }

  const directory = avatarDirectory(uploadDir);
  const filename = `${randomUUID()}.${type.extension}`;

  // An upload directory the process cannot write to is a deployment fault, not
  // a bad request, and it fails the same way for everybody until someone fixes
  // it. Saying so — with the path and the underlying errno — is the difference
  // between one log line and an afternoon: the usual cause is a container that
  // drops to an unprivileged user over a root-owned directory, and a bare 500
  // says nothing about which of the two is wrong.
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), buffer);
  } catch (error) {
    logger.error(
      `Could not write an avatar to ${directory} (UPLOAD_DIR=${uploadDir}). ` +
        'The directory must exist and be writable by the user the API runs as.',
      error instanceof Error ? error.stack : String(error),
    );

    throw new ServiceUnavailableException('error.photoStoreUnavailable');
  }

  return filename;
}

export async function removeAvatar(
  uploadDir: string,
  photo: string | null,
): Promise<void> {
  const filename = photo?.split('/').pop();
  if (!filename) return;

  const path = avatarPath(uploadDir, filename);
  if (!path) return;

  try {
    await unlink(path);
  } catch {}
}
