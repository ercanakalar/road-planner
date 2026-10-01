// The same rules the server enforces on a nickname, checked here first so a
// nickname that could never be saved is caught as it is typed, without a
// round trip.
export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 30;

const NICKNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export type NicknameProblem = 'tooShort' | 'tooLong' | 'characters';

export const nicknameProblem = (nickname: string): NicknameProblem | null => {
  const value = nickname.trim();

  if (value.length < NICKNAME_MIN_LENGTH) return 'tooShort';
  if (value.length > NICKNAME_MAX_LENGTH) return 'tooLong';
  if (!NICKNAME_PATTERN.test(value)) return 'characters';

  return null;
};

// Nicknames are unique regardless of letter case: 'Ercan' is taken by
// whoever holds 'ercan'.
export const isSameNickname = (one: string, other: string): boolean =>
  one.trim().toLowerCase() === other.trim().toLowerCase();
