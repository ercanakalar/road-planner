import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { convertFormDataAsync } from 'expo/src/winter/fetch/convertFormData';

import { AVATAR_MAX_BYTES } from 'constants/avatar';
import { isPhotoTooLarge, toUploadPart } from './photoUpload';

const aPhoto = (name = 'a1b2c3.jpeg') => {
  const path = join(mkdtempSync(join(tmpdir(), 'picked-')), name);
  writeFileSync(path, Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02, 0x03]));
  return { uri: `file://${path}`, path };
};

const encode = (part: unknown) =>
  convertFormDataAsync({
    entries: () => [['photo', part]],
  } as unknown as FormData);

const asText = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

describe('toUploadPart', () => {
  it('produces a part Expo can put in a multipart body', async () => {
    const { uri } = aPhoto();

    await expect(encode(toUploadPart({ uri }))).resolves.toBeDefined();
  });

  it('refuses React Native file objects, which is the bug this replaced', async () => {
    await expect(
      encode({ uri: 'file:///tmp/a.jpg', name: 'a.jpg', type: 'image/jpeg' }),
    ).rejects.toThrow(/Unsupported FormDataPart implementation/);
  });

  it('carries the file bytes, not a description of them', async () => {
    const { uri } = aPhoto();

    const { body } = await encode(toUploadPart({ uri }));

    expect(asText(body)).toContain('\xff\xd8\xff');
  });

  it('names the part after the file, so the server sees a filename', async () => {
    const { uri } = aPhoto('holiday.jpeg');

    const { body } = await encode(toUploadPart({ uri }));

    expect(asText(body)).toContain('name="photo"');
    expect(asText(body)).toContain('filename="holiday.jpeg"');
  });

  it('takes the content type from the file rather than guessing at the uri', async () => {
    const { uri } = aPhoto('a1b2c3.png');

    const { body } = await encode(toUploadPart({ uri }));

    expect(asText(body)).toContain('content-type: image/png');
  });
});

describe('isPhotoTooLarge', () => {
  it('is true past the limit', () => {
    expect(isPhotoTooLarge(AVATAR_MAX_BYTES + 1)).toBe(true);
  });

  it('is false at the limit', () => {
    expect(isPhotoTooLarge(AVATAR_MAX_BYTES)).toBe(false);
  });

  it('lets an unknown size through', () => {
    expect(isPhotoTooLarge(undefined)).toBe(false);
    expect(isPhotoTooLarge(null)).toBe(false);
  });
});
