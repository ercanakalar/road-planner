import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';

import {
  TrackUsage,
  signedInUser,
  UsageTracking,
} from './track-usage.decorator';
import { UsageInterceptor } from './usage.interceptor';
import { UsageRecorder } from './usage.recorder';
import { ViewerResolver } from './viewer.resolver';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('UsageInterceptor', () => {
  let recorder: { record: jest.Mock };
  let viewers: { userIdOf: jest.Mock };
  let interceptor: UsageInterceptor;

  beforeEach(() => {
    recorder = { record: jest.fn() };
    viewers = { userIdOf: jest.fn().mockResolvedValue('viewer-1') };
    interceptor = new UsageInterceptor(
      new Reflector(),
      recorder as unknown as UsageRecorder,
      viewers as unknown as ViewerResolver,
    );
  });

  const handlerTracking = (tracking?: Parameters<typeof TrackUsage>[0]) => {
    const handler = () => undefined;
    if (tracking)
      TrackUsage(tracking)(handler, 'handler', {
        value: handler,
      } as PropertyDescriptor);
    return handler;
  };

  const context = (
    handler: () => unknown,
    request: Record<string, unknown> = {},
    type = 'http',
  ) =>
    ({
      getType: () => type,
      getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  const respond = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  it('counts a successful call to a tracked endpoint, for the caller', async () => {
    const handler = handlerTracking('route_created');

    await lastValueFrom(
      interceptor.intercept(context(handler), respond({ ok: true })),
    );
    await flush();

    expect(recorder.record).toHaveBeenCalledWith('route_created', {
      userId: 'viewer-1',
      detail: null,
    });
  });

  it('passes the response through untouched', async () => {
    const handler = handlerTracking('route_created');
    const response = { status: 'success', data: { id: 'r1' } };

    await expect(
      lastValueFrom(interceptor.intercept(context(handler), respond(response))),
    ).resolves.toBe(response);
  });

  it('leaves an untracked endpoint alone', async () => {
    await lastValueFrom(
      interceptor.intercept(context(handlerTracking()), respond({})),
    );
    await flush();

    expect(recorder.record).not.toHaveBeenCalled();
    expect(viewers.userIdOf).not.toHaveBeenCalled();
  });

  it('does not count a call that failed', async () => {
    const handler = handlerTracking('route_created');
    const failing: CallHandler = {
      handle: () => throwError(() => new Error('nope')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context(handler), failing)),
    ).rejects.toThrow('nope');
    await flush();

    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('reads the detail from the request', async () => {
    const handler = handlerTracking({
      event: 'maps_directions',
      detail: ({ body }) => body?.mode,
    });

    await lastValueFrom(
      interceptor.intercept(
        context(handler, { body: { mode: 'walking' } }),
        respond({}),
      ),
    );
    await flush();

    expect(recorder.record).toHaveBeenCalledWith('maps_directions', {
      userId: 'viewer-1',
      detail: 'walking',
    });
  });

  it('skips a call whose event function says it is not worth counting', async () => {
    const tracking: UsageTracking = { event: () => null };

    await lastValueFrom(
      interceptor.intercept(context(handlerTracking(tracking)), respond({})),
    );
    await flush();

    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('credits a sign-in to the account the response names', async () => {
    const handler = handlerTracking({
      event: 'account_signed_in',
      subject: signedInUser,
    });

    await lastValueFrom(
      interceptor.intercept(
        context(handler),
        respond({ data: { userId: 'new-session-user' } }),
      ),
    );
    await flush();

    expect(recorder.record).toHaveBeenCalledWith('account_signed_in', {
      userId: 'new-session-user',
      detail: null,
    });
    expect(viewers.userIdOf).not.toHaveBeenCalled();
  });

  it('ignores calls that are not HTTP', async () => {
    const handler = handlerTracking('route_created');

    await lastValueFrom(
      interceptor.intercept(context(handler, {}, 'rpc'), respond({})),
    );
    await flush();

    expect(recorder.record).not.toHaveBeenCalled();
  });
});
