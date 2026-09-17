import { ToastType } from 'src/common/type/status.type';

/**
 * Something to say to a person, before it is known what language they read in.
 *
 * A bare string is a translation key — or, while a corner of the API is still
 * being moved over, the English sentence itself, which resolves to itself
 * because nothing in the dictionary matches it. The object form carries the
 * values a sentence interpolates.
 *
 * Services build these; the response interceptor and the exception filter are
 * the only places that turn one into words, because they are the only places
 * that know whose request it is.
 */
export type Phrase =
  string | { key: string; args: Record<string, unknown>; fallback?: string };

/**
 * `fallback` is what a key with no entry reads as. Without one a missing key
 * shows itself, which is the right default for a sentence somebody wrote; it
 * is the wrong one for a key built from a field name at runtime, where there is
 * no dictionary entry to expect and the field name itself is the answer.
 */
export const phrase = (
  key: string,
  args: Record<string, unknown>,
  fallback?: string,
): Phrase => (fallback === undefined ? { key, args } : { key, args, fallback });

export interface ApiEnvelope<T = unknown> {
  status: ToastType;
  header?: string;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

/** The same envelope before its words have been chosen. */
export interface RawEnvelope<T = unknown> {
  status: ToastType;
  header?: Phrase;
  message?: Phrase;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface EnvelopeParts<T> {
  header?: Phrase;
  message?: Phrase;
  data?: T;
  meta?: Record<string, unknown>;
}

export function ok<T>(
  parts: EnvelopeParts<T> & { data: T },
): RawEnvelope<T> & { data: T };
export function ok(parts?: EnvelopeParts<never>): RawEnvelope<never>;
export function ok<T>(parts: EnvelopeParts<T> = {}): RawEnvelope<T> {
  const envelope: RawEnvelope<T> = { status: ToastType.Success };

  if (parts.header !== undefined) envelope.header = parts.header;
  if (parts.message !== undefined) envelope.message = parts.message;
  if (parts.data !== undefined) envelope.data = parts.data;
  if (parts.meta !== undefined) envelope.meta = parts.meta;

  return envelope;
}

export function isEnvelope(value: unknown): value is ApiEnvelope {
  if (typeof value !== 'object' || value === null) return false;

  const status = (value as { status?: unknown }).status;

  return (
    typeof status === 'string' &&
    (Object.values(ToastType) as string[]).includes(status)
  );
}
