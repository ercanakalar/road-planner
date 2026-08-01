import {
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { createExecutionContext, createPrismaMock } from 'src/testing/mocks';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let reflector: Reflector;
  let guard: PermissionsGuard;

  beforeEach(() => {
    prisma = createPrismaMock();
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector, prisma as any);
  });

  const userWithPermissions = (...names: string[]) => ({
    id: 'user-1',
    permit: { name: 'USER', permissions: names.map((name) => ({ name })) },
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows a user holding the required permission', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue('ACCESS_DASHBOARD');
    prisma.user.findUnique.mockResolvedValue(
      userWithPermissions('ACCESS_DASHBOARD'),
    );
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows when the permission is one of several held', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('MANAGE_USERS');
    prisma.user.findUnique.mockResolvedValue(
      userWithPermissions('DO_COMMENTS', 'MANAGE_USERS'),
    );
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a user lacking the required permission', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue('ACCESS_DASHBOARD');
    prisma.user.findUnique.mockResolvedValue(
      userWithPermissions('DO_COMMENTS'),
    );
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies a user with no permit', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue('ACCESS_DASHBOARD');
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', permit: null });
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies when the user record no longer exists', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue('ACCESS_DASHBOARD');
    prisma.user.findUnique.mockResolvedValue(null);
    const { context } = createExecutionContext({ user: { userId: 'gone' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('reports a missing @RequirePermission as a wiring error, not a 403', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    prisma.user.findUnique.mockResolvedValue(
      userWithPermissions('ACCESS_DASHBOARD'),
    );
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('never grants access when metadata is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const { context } = createExecutionContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it('rejects an unauthenticated request as 401, not 500', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue('ACCESS_DASHBOARD');
    const { context } = createExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('reads metadata from the controller as well as the handler', async () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue('ACCESS_DASHBOARD');
    prisma.user.findUnique.mockResolvedValue(
      userWithPermissions('ACCESS_DASHBOARD'),
    );
    const handler = function handler() {};
    const controller = class Controller {};
    const { context } = createExecutionContext({
      user: { userId: 'user-1' },
      handler,
      controller,
    });

    await guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith('permission', [handler, controller]);
  });

  it('reads permissions from the database rather than the token', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue('ACCESS_DASHBOARD');
    prisma.user.findUnique.mockResolvedValue(
      userWithPermissions('DO_COMMENTS'),
    );
    const { context } = createExecutionContext({
      user: {
        userId: 'user-1',
        permissions: [{ name: 'ACCESS_DASHBOARD' }],
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
