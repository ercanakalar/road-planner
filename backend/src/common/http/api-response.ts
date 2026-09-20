import { ToastType } from 'src/common/type/status.type';

export type Phrase =
  string | { key: string; args: Record<string, unknown>; fallback?: string };

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
