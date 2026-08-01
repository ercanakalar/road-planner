import { ToastType } from 'src/common/type/status.type';
import { isEnvelope, ok } from './api-response';

describe('ok', () => {
  it('stamps a success status', () => {
    expect(ok()).toEqual({ status: ToastType.Success });
  });

  it('carries header, message and data through', () => {
    expect(ok({ header: 'H', message: 'M', data: { a: 1 } })).toEqual({
      status: ToastType.Success,
      header: 'H',
      message: 'M',
      data: { a: 1 },
    });
  });

  it('omits header and message when they are not supplied', () => {
    const envelope = ok({ data: 'x' });

    expect(Object.keys(envelope)).toEqual(['status', 'data']);
  });

  it('omits data when it is not supplied', () => {
    expect('data' in ok({ message: 'done' })).toBe(false);
  });

  it('keeps an explicit null payload', () => {
    expect(ok({ data: null })).toEqual({
      status: ToastType.Success,
      data: null,
    });
  });

  it('preserves an empty array rather than dropping it', () => {
    expect(ok({ data: [] }).data).toEqual([]);
  });
});

describe('isEnvelope', () => {
  it.each([
    ['a success envelope', ok({ data: 1 })],
    ['a bare status', { status: ToastType.Success }],
    ['an error status', { status: ToastType.Error }],
    ['an info status', { status: ToastType.Info }],
  ])('recognises %s', (_label, value) => {
    expect(isEnvelope(value)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'success'],
    ['a number', 1],
    ['an array', [{ status: 'success' }]],
    ['an object with no status', { data: 1 }],
    ['an unknown status value', { status: 'ok' }],
    ['a non-string status', { status: 200 }],
  ])('rejects %s', (_label, value) => {
    expect(isEnvelope(value)).toBe(false);
  });

  it('does not mistake a domain object for an envelope', () => {
    expect(isEnvelope({ id: 'road-1', title: 'Trip', status: 'draft' })).toBe(
      false,
    );
  });
});
