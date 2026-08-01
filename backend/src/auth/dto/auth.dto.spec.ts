import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import {
  ForgotPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
} from './auth.dto';

const VALID_PASSWORD = 'Str0ng-Password';

describe('SignUpDto', () => {
  const valid = () => ({
    email: 'user@example.com',
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  });

  it('accepts the payload the shipped client sends', async () => {
    await expect(collectDtoErrors(SignUpDto, valid())).resolves.toEqual([]);
  });

  it('accepts a payload without confirmPassword', async () => {
    await expect(
      collectDtoErrors(SignUpDto, {
        email: 'user@example.com',
        password: VALID_PASSWORD,
      }),
    ).resolves.toEqual([]);
  });

  describe('email', () => {
    it.each([
      'not-an-email',
      'missing@tld',
      '@example.com',
      'a b@example.com',
      '',
    ])('rejects %p', async (email) => {
      await expect(
        collectDtoErrors(SignUpDto, { ...valid(), email }),
      ).resolves.not.toEqual([]);
    });

    it('normalises case, so Foo@Example.com and foo@example.com are one account', async () => {
      const result = await validateDto(SignUpDto, {
        ...valid(),
        email: '  Foo@Example.COM  ',
      });

      expect(result.email).toBe('foo@example.com');
    });

    it('rejects an address longer than 254 characters', async () => {
      const email = `${'a'.repeat(250)}@example.com`;

      await expect(
        collectDtoErrors(SignUpDto, { ...valid(), email }),
      ).resolves.not.toEqual([]);
    });
  });

  describe('password policy', () => {
    it('rejects a password shorter than 8 characters', async () => {
      await expect(
        collectDtoErrors(SignUpDto, { ...valid(), password: 'Sh0rt' }),
      ).resolves.not.toEqual([]);
    });

    it('rejects a password with no digit', async () => {
      await expect(
        collectDtoErrors(SignUpDto, { ...valid(), password: 'onlyletters' }),
      ).resolves.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/at least one letter and one digit/),
        ]),
      );
    });

    it('rejects a password with no letter', async () => {
      await expect(
        collectDtoErrors(SignUpDto, { ...valid(), password: '12345678' }),
      ).resolves.not.toEqual([]);
    });

    it('rejects a password longer than 128 characters', async () => {
      const password = `${'a'.repeat(130)}1`;

      await expect(
        collectDtoErrors(SignUpDto, { ...valid(), password }),
      ).resolves.not.toEqual([]);
    });

    it('accepts a password at exactly 128 characters', async () => {
      const password = `${'a'.repeat(127)}1`;

      await expect(
        collectDtoErrors(SignUpDto, { ...valid(), password }),
      ).resolves.toEqual([]);
    });
  });

  it('strips undeclared properties', async () => {
    const result = await validateDto(SignUpDto, {
      ...valid(),
      permitId: '909c9b35-eec3-4afe-a21d-986682659f5a',
      isAdmin: true,
    });

    expect(result).not.toHaveProperty('permitId');
    expect(result).not.toHaveProperty('isAdmin');
  });
});

describe('SignInDto', () => {
  const valid = () => ({ email: 'user@example.com', password: 'anything' });

  it('accepts valid credentials', async () => {
    await expect(collectDtoErrors(SignInDto, valid())).resolves.toEqual([]);
  });

  it('accepts a short password so pre-policy accounts can still sign in', async () => {
    await expect(
      collectDtoErrors(SignInDto, { ...valid(), password: 'abc' }),
    ).resolves.toEqual([]);
  });

  it('accepts a password with no digit', async () => {
    await expect(
      collectDtoErrors(SignInDto, { ...valid(), password: 'onlyletters' }),
    ).resolves.toEqual([]);
  });

  it('still bounds the password length as a hashing-cost guard', async () => {
    await expect(
      collectDtoErrors(SignInDto, { ...valid(), password: 'a'.repeat(129) }),
    ).resolves.not.toEqual([]);
  });

  it('requires a password', async () => {
    await expect(
      collectDtoErrors(SignInDto, { email: 'user@example.com' }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a malformed email', async () => {
    await expect(
      collectDtoErrors(SignInDto, { ...valid(), email: 'nope' }),
    ).resolves.not.toEqual([]);
  });

  it('trims but does not lowercase, to preserve existing mixed-case accounts', async () => {
    const result = await validateDto(SignInDto, {
      ...valid(),
      email: '  Foo@Example.com  ',
    });

    expect(result.email).toBe('Foo@Example.com');
  });
});

describe('ForgotPasswordDto', () => {
  it('accepts a valid email', async () => {
    await expect(
      collectDtoErrors(ForgotPasswordDto, { email: 'user@example.com' }),
    ).resolves.toEqual([]);
  });

  it('rejects a missing email', async () => {
    await expect(collectDtoErrors(ForgotPasswordDto, {})).resolves.not.toEqual(
      [],
    );
  });

  it('rejects a malformed email', async () => {
    await expect(
      collectDtoErrors(ForgotPasswordDto, { email: 'nope' }),
    ).resolves.not.toEqual([]);
  });
});

describe('ResetPasswordDto', () => {
  const valid = () => ({
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  });

  it('accepts a matching pair', async () => {
    await expect(collectDtoErrors(ResetPasswordDto, valid())).resolves.toEqual(
      [],
    );
  });

  it('requires confirmPassword', async () => {
    await expect(
      collectDtoErrors(ResetPasswordDto, { password: VALID_PASSWORD }),
    ).resolves.not.toEqual([]);
  });

  it('enforces the password policy', async () => {
    await expect(
      collectDtoErrors(ResetPasswordDto, {
        password: 'weak',
        confirmPassword: 'weak',
      }),
    ).resolves.not.toEqual([]);
  });

  it('leaves the equality check to the service', async () => {
    await expect(
      collectDtoErrors(ResetPasswordDto, {
        password: VALID_PASSWORD,
        confirmPassword: 'Different-1',
      }),
    ).resolves.toEqual([]);
  });
});

describe('RefreshTokenDto', () => {
  const JWT =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIn0.c2lnbmF0dXJl';

  it('accepts a JWT', async () => {
    await expect(
      collectDtoErrors(RefreshTokenDto, { refreshToken: JWT }),
    ).resolves.toEqual([]);
  });

  it('rejects a value that is not a JWT', async () => {
    await expect(
      collectDtoErrors(RefreshTokenDto, { refreshToken: 'not-a-jwt' }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a missing token', async () => {
    await expect(collectDtoErrors(RefreshTokenDto, {})).resolves.not.toEqual(
      [],
    );
  });

  it('rejects a non-string token', async () => {
    await expect(
      collectDtoErrors(RefreshTokenDto, { refreshToken: 12345 }),
    ).resolves.not.toEqual([]);
  });
});
