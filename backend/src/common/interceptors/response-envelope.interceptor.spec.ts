import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { ok } from 'src/common/http/api-response';
import { ToastType } from 'src/common/type/status.type';
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
  const interceptor = new ResponseEnvelopeInterceptor();
  const context = {} as ExecutionContext;

  const handlerReturning = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  it('envelopes a bare handler result', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context, handlerReturning('a-url')),
    );

    expect(result).toEqual({ status: ToastType.Success, data: 'a-url' });
  });

  it('passes a handler that already envelopes through unchanged', async () => {
    const envelope = ok({ header: 'H', message: 'M' });

    const result = await firstValueFrom(
      interceptor.intercept(context, handlerReturning(envelope)),
    );

    expect(result).toBe(envelope);
  });

  it('envelopes a void handler', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context, handlerReturning(undefined)),
    );

    expect(result).toEqual({ status: ToastType.Success, data: null });
  });
});
