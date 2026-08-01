import { ToastType } from 'src/common/type/status.type';

export interface ApiEnvelope<T = unknown> {
  status: ToastType;
  header?: string;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface EnvelopeParts<T> {
  header?: string;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export function ok<T>(
  parts: EnvelopeParts<T> & { data: T },
): ApiEnvelope<T> & { data: T };
export function ok(parts?: EnvelopeParts<never>): ApiEnvelope<never>;
export function ok<T>(parts: EnvelopeParts<T> = {}): ApiEnvelope<T> {
  const envelope: ApiEnvelope<T> = { status: ToastType.Success };

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
