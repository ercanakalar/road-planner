import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { createExecutionContext } from 'src/testing/mocks';
import { AccessGuard } from './access.guard';

describe('AccessGuard', () => {
  let reflector: Reflector;
  let guard: AccessGuard;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AccessGuard(reflector);

    superCanActivate = jest
      .spyOn(AuthGuard('jwt-access').prototype, 'canActivate')
      .mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows a route marked @Public() without verifying a token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const { context } = createExecutionContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('verifies the token on a route that is not public', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const { context } = createExecutionContext();

    guard.canActivate(context);

    expect(superCanActivate).toHaveBeenCalledWith(context);
  });

  it('defaults to requiring authentication when no metadata is present', () => {
    const { context } = createExecutionContext();

    guard.canActivate(context);

    expect(superCanActivate).toHaveBeenCalled();
  });

  it('reads the isPublic flag from both the handler and the controller', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(false);
    const handler = function handler() {};
    const controller = class Controller {};
    const { context } = createExecutionContext({ handler, controller });

    guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith('isPublic', [handler, controller]);
  });
});
