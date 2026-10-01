import {
  isSameNickname,
  NICKNAME_MAX_LENGTH,
  nicknameProblem,
} from './nickname';

describe('nicknameProblem', () => {
  it.each(['ercan_a', 'ercan.a', 'ercan-a', 'Ercan123', 'abc'])(
    'accepts %p',
    (nickname) => {
      expect(nicknameProblem(nickname)).toBeNull();
    },
  );

  it('measures the nickname without the spaces around it', () => {
    expect(nicknameProblem('  abc  ')).toBeNull();
    expect(nicknameProblem('  ab  ')).toBe('tooShort');
  });

  it('wants three characters at least', () => {
    expect(nicknameProblem('ab')).toBe('tooShort');
    expect(nicknameProblem('')).toBe('tooShort');
  });

  it('allows thirty at most', () => {
    expect(nicknameProblem('a'.repeat(NICKNAME_MAX_LENGTH))).toBeNull();
    expect(nicknameProblem('a'.repeat(NICKNAME_MAX_LENGTH + 1))).toBe('tooLong');
  });

  it.each(['has space', 'şehir', 'semi;colon', '<script>', 'émile'])(
    'refuses the characters in %p',
    (nickname) => {
      expect(nicknameProblem(nickname)).toBe('characters');
    },
  );
});

describe('isSameNickname', () => {
  it('treats a change of letter case as the same nickname', () => {
    expect(isSameNickname('Ercan', 'ercan')).toBe(true);
  });

  it('tells different nicknames apart', () => {
    expect(isSameNickname('ercan', 'ercan_a')).toBe(false);
  });
});
