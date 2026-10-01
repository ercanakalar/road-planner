import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { EnvironmentVariables } from 'src/config/env.validation';
import { createConfigMock } from 'src/testing/mocks';
import { ViewerResolver } from './viewer.resolver';

const ACCESS_KEY = 'test-access-key-that-is-long-enough-32';

describe('ViewerResolver', () => {
  const jwt = new JwtService({});
  const resolver = new ViewerResolver(
    jwt,
    createConfigMock({ ACCESS_KEY }) as unknown as ConfigService<
      EnvironmentVariables,
      true
    >,
  );

  const bearer = (token: string) => ({
    headers: { authorization: `Bearer ${token}` },
  });

  it('trusts the user a guard already established', async () => {
    await expect(
      resolver.userIdOf({ user: { userId: 'user-1' } }),
    ).resolves.toBe('user-1');
  });

  it('reads the person from a valid token on a guard-free endpoint', async () => {
    const token = await jwt.signAsync(
      { userId: 'user-2' },
      { secret: ACCESS_KEY },
    );

    await expect(resolver.userIdOf(bearer(token))).resolves.toBe('user-2');
  });

  it('treats a caller without a token as anonymous', async () => {
    await expect(resolver.userIdOf({ headers: {} })).resolves.toBeNull();
  });

  it('treats a token signed with another key as anonymous, not as an error', async () => {
    const forged = await jwt.signAsync(
      { userId: 'user-3' },
      { secret: 'some-other-key-that-is-long-enough-to-sign' },
    );

    await expect(resolver.userIdOf(bearer(forged))).resolves.toBeNull();
  });

  it('treats an expired token as anonymous', async () => {
    const expired = await jwt.signAsync(
      { userId: 'user-4', exp: Math.floor(Date.now() / 1000) - 60 },
      { secret: ACCESS_KEY },
    );

    await expect(resolver.userIdOf(bearer(expired))).resolves.toBeNull();
  });

  it('treats a token that names nobody as anonymous', async () => {
    const token = await jwt.signAsync(
      { email: 'a@b.com' },
      { secret: ACCESS_KEY },
    );

    await expect(resolver.userIdOf(bearer(token))).resolves.toBeNull();
  });
});
