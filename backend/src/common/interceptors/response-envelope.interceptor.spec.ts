import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { ok, phrase } from 'src/common/http/api-response';
import { ToastType } from 'src/common/type/status.type';
import { testI18n } from 'src/testing/i18n';
import {
  ResponseEnvelopeInterceptor,
  toEnvelope,
} from './response-envelope.interceptor';

describe('toEnvelope', () => {
  it('leaves an existing envelope untouched', () => {
    const envelope = ok({ header: 'H', message: 'M', data: { a: 1 } });

    expect(toEnvelope(envelope)).toBe(envelope);
  });

  it.each([
    ['a string', 'https://example.com/share/abc'],
    ['an array', [{ id: 'permit-1' }]],
    ['an object', { id: 'road-1', title: 'Trip' }],
    ['a number', 42],
    ['false', false],
    ['an empty string', ''],
  ])('wraps %s as data', (_label, value) => {
    expect(toEnvelope(value)).toEqual({
      status: ToastType.Success,
      data: value,
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('turns %s into a null payload', (_label, value) => {
    expect(toEnvelope(value)).toEqual({
      status: ToastType.Success,
      data: null,
    });
  });

  it('never invents a message', () => {
    expect(toEnvelope({ id: 'road-1' })).not.toHaveProperty('message');
    expect(toEnvelope(undefined)).not.toHaveProperty('message');
  });
});

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor(testI18n());

  // The interceptor reads Accept-Language off the request to decide which
  // words to use, so a context without one is not a context it ever sees.
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  } as unknown as ExecutionContext;

  const handlerReturning = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  it('envelopes a bare handler result', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context, handlerReturning('a-url')),
    );

    expect(result).toEqual({ status: ToastType.Success, data: 'a-url' });
  });

  it('does not wrap a handler that already envelopes', async () => {
    // A copy rather than the same object: the envelope now leaves here with
    // its words chosen, so it cannot be the one the service built.
    const envelope = ok({ header: 'H', message: 'M' });

    const result = await firstValueFrom(
      interceptor.intercept(context, handlerReturning(envelope)),
    );

    expect(result).toEqual({ status: 'success', header: 'H', message: 'M' });
    expect(result).not.toHaveProperty('data');
  });

  it('says a known key in the language the request asked for', async () => {
    const turkish = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'accept-language': 'tr-TR,tr;q=0.9' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await firstValueFrom(
      interceptor.intercept(
        turkish,
        handlerReturning(ok({ header: 'notification.header' })),
      ),
    );

    expect(result.header).toBe('Bildirimler');
  });

  it('leaves a sentence it has no translation for as it is', async () => {
    // What keeps a corner of the API still emitting English working: the
    // sentence is its own fallback.
    const result = await firstValueFrom(
      interceptor.intercept(
        context,
        handlerReturning(ok({ message: 'Something we never put in a locale' })),
      ),
    );

    expect(result.message).toBe('Something we never put in a locale');
  });

  it('fills in what a sentence interpolates', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(
        context,
        handlerReturning(
          ok({
            message: phrase('permit.assigned', {
              name: 'Ada',
              permit: 'ADMIN',
            }),
          }),
        ),
      ),
    );

    expect(result.message).toBe('Ada now holds the ADMIN permit');
  });

  it('picks the branch a count calls for', async () => {
    const say = async (count: number) =>
      (
        await firstValueFrom(
          interceptor.intercept(
            context,
            handlerReturning(
              ok({ message: phrase('maps.alongFound', { count }) }),
            ),
          ),
        )
      ).message;

    expect(await say(1)).toBe('1 place along your route');
    expect(await say(4)).toBe('4 places along your route');
  });

  it('says what a phrase falls back to when nothing translates its key', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(
        context,
        handlerReturning(
          ok({ message: phrase('field.notAField', {}, 'notAField') }),
        ),
      ),
    );

    expect(result.message).toBe('notAField');
  });

  it('envelopes a void handler', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context, handlerReturning(undefined)),
    );

    expect(result).toEqual({ status: ToastType.Success, data: null });
  });
});
