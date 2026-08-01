import { ConflictException } from '@nestjs/common';

import { createExecutionContext, createPrismaMock } from 'src/testing/mocks';
import { UserExistsGuard } from './user-exists.guard';

describe('UserExistsGuard', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let guard: UserExistsGuard;

  beforeEach(() => {
    prisma = createPrismaMock();
    guard = new UserExistsGuard(prisma as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows an email that has no manual credentials yet', async () => {
    prisma.manuelAuth.findUnique.mockResolvedValue(null);
    const { context } = createExecutionContext({
      body: { email: 'new@example.com' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects an email that is already registered', async () => {
    prisma.manuelAuth.findUnique.mockResolvedValue({
      id: 'auth-1',
      email: 'taken@example.com',
    });
    const { context } = createExecutionContext({
      body: { email: 'taken@example.com' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ConflictException);
  });

  it('looks the email up exactly as supplied', async () => {
    prisma.manuelAuth.findUnique.mockResolvedValue(null);
    const { context } = createExecutionContext({
      body: { email: 'new@example.com' },
    });

    await guard.canActivate(context);

    expect(prisma.manuelAuth.findUnique).toHaveBeenCalledWith({
      where: { email: 'new@example.com' },
      select: { id: true },
    });
  });

  it('rejects in English', async () => {
    prisma.manuelAuth.findUnique.mockResolvedValue({ id: 'auth-1' });
    const { context } = createExecutionContext({
      body: { email: 'taken@example.com' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'An account with this email already exists',
    );
  });

  describe('unvalidated input', () => {
    beforeEach(() => {
      prisma.manuelAuth.findUnique.mockResolvedValue(null);
    });

    it.each([
      ['an absent email', {}],
      ['a null email', { email: null }],
      ['a numeric email', { email: 42 }],
      ['an object email', { email: { contains: 'a' } }],
      ['an array email', { email: ['a@b.com'] }],
      ['a blank email', { email: '   ' }],
    ])('passes %s through without querying', async (_label, body) => {
      const { context } = createExecutionContext({ body });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(prisma.manuelAuth.findUnique).not.toHaveBeenCalled();
    });

    it('tolerates a request with no body at all', async () => {
      const { context } = createExecutionContext({ body: undefined });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });
});
