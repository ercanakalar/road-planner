import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { createExecutionContext, createPrismaMock } from 'src/testing/mocks';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let guard: AdminGuard;

  beforeEach(() => {
    prisma = createPrismaMock();
    guard = new AdminGuard(prisma as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows a user holding the ADMIN permit', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      permit: { name: 'ADMIN' },
    });
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a user holding a non-admin permit', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      permit: { name: 'USER' },
    });
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies a user with no permit at all', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', permit: null });
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies when the user record no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const { context } = createExecutionContext({ user: { userId: 'gone' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects an unauthenticated request as 401, not 500', async () => {
    const { context } = createExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a principal with no userId', async () => {
    const { context } = createExecutionContext({ user: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('reads the permit from the database rather than trusting the token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      permit: { name: 'ADMIN' },
    });
    const { context } = createExecutionContext({
      user: { userId: 'user-1', permit: { name: 'USER' } },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      include: { permit: true },
    });
  });
});
