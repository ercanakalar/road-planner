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
