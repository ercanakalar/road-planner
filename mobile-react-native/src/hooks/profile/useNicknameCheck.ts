import useDebouncedValue from 'hooks/common/useDebouncedValue';
import { useCheckNicknameQuery } from 'store/services/profileService';
import { NicknameAvailability } from 'types/store/services/userService-type';
import { isSameNickname, NicknameProblem, nicknameProblem } from 'utils/nickname';

// Long enough that a check waits for a pause in typing rather than chasing
// every keystroke.
const CHECK_DELAY_MS = 450;

export type NicknameStatus =
  | { kind: 'unchanged' }
  | { kind: 'empty' }
  | { kind: 'required' }
  | { kind: 'invalid'; problem: NicknameProblem }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'unverified' };

interface StatusInput {
  value: string;
  original: string;
  knownTaken: string | null;
  isSettled: boolean;
  isFetching: boolean;
  isError: boolean;
  answer: NicknameAvailability | undefined;
}

export const deriveNicknameStatus = ({
  value,
  original,
  knownTaken,
  isSettled,
  isFetching,
  isError,
  answer,
}: StatusInput): NicknameStatus => {
  // The API ignores an empty nickname, so one that is set cannot be cleared.
  if (!value) return original ? { kind: 'required' } : { kind: 'empty' };

  if (value === original) return { kind: 'unchanged' };

  const problem = nicknameProblem(value);
  if (problem) return { kind: 'invalid', problem };

  if (knownTaken && isSameNickname(knownTaken, value)) return { kind: 'taken' };

  if (!isSettled || isFetching) return { kind: 'checking' };

  // The check could not be made; saving still asks the server, which has the
  // final word.
  if (isError) return { kind: 'unverified' };

  if (answer && isSameNickname(answer.nickName, value)) {
    return answer.available ? { kind: 'available' } : { kind: 'taken' };
  }

  return { kind: 'checking' };
};

const SAVEABLE: NicknameStatus['kind'][] = [
  'unchanged',
  'empty',
  'available',
  'unverified',
];

export const canSaveNickname = (status: NicknameStatus): boolean =>
  SAVEABLE.includes(status.kind);

export function useNicknameCheck(
  input: string,
  current: string | null | undefined,
  knownTaken: string | null = null,
): NicknameStatus {
  const value = input.trim();
  const original = current?.trim() ?? '';

  const debounced = useDebouncedValue(value, CHECK_DELAY_MS);
  const isSettled = debounced === value;

  const shouldAsk =
    isSettled && !!value && value !== original && !nicknameProblem(value);

  const { currentData, isFetching, isError } = useCheckNicknameQuery(
    debounced,
    { skip: !shouldAsk },
  );

  return deriveNicknameStatus({
    value,
    original,
    knownTaken,
    isSettled,
    isFetching,
    isError,
    answer: currentData,
  });
}

export default useNicknameCheck;
