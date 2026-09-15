import { File } from 'expo-file-system';

import { AVATAR_MAX_BYTES } from 'constants/avatar';

/** A picked image, as the part of a multipart body that carries it. */
export interface PickedPhoto {
  uri: string;
}

/** The fields of an image picker asset this cares about. */
export interface PickedAsset {
  uri: string;
  fileSize?: number | null;
}

/**
 * The multipart part for a picked image.
 *
 * Expo replaces the global `fetch`, and its own encoder accepts three kinds of
 * part: a string, a `Blob`, or an object exposing `bytes()`. React Native's
 * file object — `{ uri, name, type }`, the shape every guide on uploading from
 * a phone shows — is not one of them, and it is refused before the request
 * leaves the device with "Unsupported FormDataPart implementation". Expo's
 * encoder says so itself, at the top of `convertFormData.ts`: "uri is not
 * supported for React Native's FormData".
 *
 * expo-file-system's `File` is the shape it does read. It implements the Blob
 * interface over a file on disk, so the bytes are read when the body is
 * encoded rather than held in memory as base64, and the name and MIME type in
 * the part's headers come from the file itself instead of from guesswork about
 * its URI.
 */
export function toUploadPart(photo: PickedPhoto): Blob {
  // `File` implements Blob without extending it, which is what Expo's encoder
  // duck-types for; the cast is only to satisfy FormData's web signature.
  return new File(photo.uri) as unknown as Blob;
}

/**
 * Whether this is bigger than the API will store. An unknown size is treated as
 * acceptable: the server checks too, and refusing to try would block an upload
 * that would have worked.
 */
export function isPhotoTooLarge(size?: number | null): boolean {
  return typeof size === 'number' && size > AVATAR_MAX_BYTES;
}
