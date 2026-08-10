import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, normalize, resolve } from 'path';

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

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
    throw new BadRequestException('An image file is required');
  }
  if (buffer.length > AVATAR_MAX_BYTES) {
    throw new BadRequestException('Images must be 5 MB or smaller');
  }

  const type = sniff(buffer);
  if (!type) {
    throw new BadRequestException(
      'Only JPEG, PNG and WebP images are accepted',
    );
  }

  const directory = avatarDirectory(uploadDir);
  await mkdir(directory, { recursive: true });

  const filename = `${randomUUID()}.${type.extension}`;
  await writeFile(join(directory, filename), buffer);

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
