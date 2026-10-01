import { canSaveNickname, deriveNicknameStatus } from './useNicknameCheck';

const settled = {
  value: 'new_name',
  original: 'old_name',
  knownTaken: null,
  isSettled: true,
  isFetching: false,
  isError: false,
  answer: undefined,
};

describe('deriveNicknameStatus', () => {
  it('has nothing to say about a nickname left as it was', () => {
    expect(
      deriveNicknameStatus({ ...settled, value: 'old_name' }),
    ).toEqual({ kind: 'unchanged' });
  });

  it('lets someone without a nickname keep going without one', () => {
    expect(
      deriveNicknameStatus({ ...settled, value: '', original: '' }),
    ).toEqual({ kind: 'empty' });
  });

  it('does not let a nickname be cleared, since saving would ignore it', () => {
    expect(deriveNicknameStatus({ ...settled, value: '' })).toEqual({
      kind: 'required',
    });
  });

  it('flags a nickname the server would refuse before asking it anything', () => {
    expect(deriveNicknameStatus({ ...settled, value: 'a b' })).toEqual({
      kind: 'invalid',
      problem: 'characters',
    });
    expect(deriveNicknameStatus({ ...settled, value: 'ab' })).toEqual({
      kind: 'invalid',
      problem: 'tooShort',
    });
  });

  it('says it is checking while the person is still typing', () => {
    expect(deriveNicknameStatus({ ...settled, isSettled: false })).toEqual({
      kind: 'checking',
    });
  });

  it('says it is checking while the answer is on its way', () => {
    expect(deriveNicknameStatus({ ...settled, isFetching: true })).toEqual({
      kind: 'checking',
    });
  });

  it('reports what the server said', () => {
    expect(
      deriveNicknameStatus({
        ...settled,
        answer: { nickName: 'new_name', available: true },
      }),
    ).toEqual({ kind: 'available' });

    expect(
      deriveNicknameStatus({
        ...settled,
        answer: { nickName: 'new_name', available: false },
      }),
    ).toEqual({ kind: 'taken' });
  });

  it('never applies an answer about a different nickname', () => {
    expect(
      deriveNicknameStatus({
        ...settled,
        answer: { nickName: 'something_else', available: true },
      }),
    ).toEqual({ kind: 'checking' });
  });

  it('reads an answer the same whatever the letter case', () => {
    expect(
      deriveNicknameStatus({
        ...settled,
        value: 'New_Name',
        answer: { nickName: 'new_name', available: false },
      }),
    ).toEqual({ kind: 'taken' });
  });

  it('remembers a nickname a save was refused for, in any letter case', () => {
    expect(
      deriveNicknameStatus({
        ...settled,
        value: 'NEW_NAME',
        knownTaken: 'new_name',
        answer: { nickName: 'NEW_NAME', available: true },
      }),
    ).toEqual({ kind: 'taken' });
  });

  it('leaves the decision to the server when the check fails', () => {
    expect(deriveNicknameStatus({ ...settled, isError: true })).toEqual({
      kind: 'unverified',
    });
  });
});

describe('canSaveNickname', () => {
  it.each(['unchanged', 'empty', 'available', 'unverified'] as const)(
    'lets a %s nickname be saved',
    (kind) => {
      expect(canSaveNickname({ kind })).toBe(true);
    },
  );

  it.each(['required', 'checking', 'taken'] as const)(
    'holds a %s nickname back',
    (kind) => {
      expect(canSaveNickname({ kind })).toBe(false);
    },
  );

  it('holds back a nickname the server would refuse', () => {
    expect(canSaveNickname({ kind: 'invalid', problem: 'tooLong' })).toBe(
      false,
    );
  });
});
