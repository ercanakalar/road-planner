import { BadRequestException } from '@nestjs/common';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  AVATAR_MAX_BYTES,
  avatarDirectory,
  avatarPath,
  removeAvatar,
  writeAvatar,
} from './avatar.storage';

const jpeg = (size = 16) =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(size)]);
const png = () =>
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(8)]);
const webp = () =>
  Buffer.concat([Buffer.from([0x52, 0x49, 0x46, 0x46]), Buffer.alloc(8)]);

describe('avatar storage', () => {
  let uploadDir: string;
  let cwd: string;

  beforeEach(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'avatars-'));
    cwd = process.cwd();
    jest.spyOn(process, 'cwd').mockReturnValue(uploadDir);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(uploadDir, { recursive: true, force: true });
    expect(process.cwd()).toBe(cwd);
  });

  describe('writeAvatar', () => {
    it('names the file from the sniffed type, not from anything supplied', async () => {
      await expect(writeAvatar('up', jpeg())).resolves.toMatch(
        /^[0-9a-f-]{36}\.jpg$/,
      );
      await expect(writeAvatar('up', png())).resolves.toMatch(/\.png$/);
      await expect(writeAvatar('up', webp())).resolves.toMatch(/\.webp$/);
    });

    it('writes the bytes it was handed', async () => {
      const buffer = jpeg();
      const filename = await writeAvatar('up', buffer);

      const written = await readFile(join(avatarDirectory('up'), filename));
      expect(written.equals(buffer)).toBe(true);
    });

    it('rejects a file whose magic bytes are not an accepted image', async () => {
      await expect(
        writeAvatar('up', Buffer.from('<?php echo 1; ?>')),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an empty upload', async () => {
      await expect(writeAvatar('up', Buffer.alloc(0))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects anything over the size cap', async () => {
      await expect(writeAvatar('up', jpeg(AVATAR_MAX_BYTES))).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('avatarPath', () => {
    it('accepts a name this service would have written', () => {
      const name = '123e4567-e89b-12d3-a456-426614174000.jpg';
      expect(avatarPath('up', name)).toBe(join(avatarDirectory('up'), name));
    });

    it.each([
      '../../../etc/passwd',
      '..%2f..%2fetc%2fpasswd',
      'nice.jpg/../../../etc/passwd',
      '/etc/passwd',
      'script.php',
      'not-a-uuid.jpg',
      '',
    ])('refuses %p', (filename) => {
      expect(avatarPath('up', filename)).toBeNull();
    });
  });

  describe('removeAvatar', () => {
    it('deletes a file it previously wrote', async () => {
      const filename = await writeAvatar('up', jpeg());
      const path = join(avatarDirectory('up'), filename);

      await removeAvatar('up', `/api/user/photo/${filename}`);

      await expect(readFile(path)).rejects.toThrow();
    });

    it('leaves an external photo url alone', async () => {
      const outside = join(uploadDir, 'keep-me.txt');
      await writeFile(outside, 'kept');

      await removeAvatar('up', 'https://lh3.googleusercontent.com/a/photo.jpg');
      await removeAvatar('up', null);
      await removeAvatar('up', '../../keep-me.txt');

      await expect(readFile(outside, 'utf8')).resolves.toBe('kept');
    });

    it('does not throw when the file is already gone', async () => {
      await expect(
        removeAvatar('up', '123e4567-e89b-12d3-a456-426614174000.jpg'),
      ).resolves.toBeUndefined();
    });
  });
});
