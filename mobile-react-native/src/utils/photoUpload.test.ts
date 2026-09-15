import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { convertFormDataAsync } from 'expo/src/winter/fetch/convertFormData';

import { AVATAR_MAX_BYTES } from 'constants/avatar';
import { isPhotoTooLarge, toUploadPart } from './photoUpload';

/** A real file on disk, so the part can be encoded rather than described. */
const aPhoto = (name = 'a1b2c3.jpeg') => {
  const path = join(mkdtempSync(join(tmpdir(), 'picked-')), name);
  writeFileSync(path, Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02, 0x03]));
  return { uri: `file://${path}`, path };
};

/**
 * A body as Expo's encoder meets one on a device: entries() handing back the
 * [name, part] pairs React Native's FormData stored, once Expo's runtime has
 * patched it at startup.
 *
 * Spelled out rather than built from the global FormData, which under jest is
 * Node's — and Node's stringifies any part that is not a string or a Blob on
 * append, so the encoder would be handed "[object Object]" and the test would
 * pass while the phone still failed.
 */
const encode = (part: unknown) =>
  convertFormDataAsync({
    entries: () => [['photo', part]],
  } as unknown as FormData);

const asText = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

describe('toUploadPart', () => {
  it('produces a part Expo can put in a multipart body', async () => {
    // The whole point. Expo replaces the global fetch and encodes the body
    // itself, so "does this part encode" is the question that decides whether
    // the upload leaves the phone at all.
    const { uri } = aPhoto();

    await expect(encode(toUploadPart({ uri }))).resolves.toBeDefined();
  });

  it('refuses React Native file objects, which is the bug this replaced', async () => {
    // `{ uri, name, type }` is the shape every guide shows and the shape the
    // app used to send. Expo's encoder throws on it before the request is made,
    // which surfaces as a FETCH_ERROR with nothing to say for itself.
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
    // The URI is a cache path the app never chose; the file knows what it is.
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
    // The server checks too, and refusing to try would block an upload that
    // would have worked — Android often reports no size at all.
    expect(isPhotoTooLarge(undefined)).toBe(false);
    expect(isPhotoTooLarge(null)).toBe(false);
  });
});
