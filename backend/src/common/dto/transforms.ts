import { TransformFnParams } from 'class-transformer';

export function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function emptyToUndefined({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
