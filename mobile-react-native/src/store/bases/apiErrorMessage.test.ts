import { apiErrorMessage } from './apiErrorMessage';

const FALLBACK = 'Your photo could not be uploaded. Please try again.';

describe('apiErrorMessage', () => {
  it('prefers what the API said went wrong', () => {
    const error = {
      status: 400,
      data: {
        status: 'error',
        header: 'Invalid Request',
        message: 'Only JPEG, PNG and WebP images are accepted',
      },
    };

    expect(apiErrorMessage(error, FALLBACK)).toBe(
      'Only JPEG, PNG and WebP images are accepted',
    );
  });

  it('says a request never reached the server', () => {
    expect(
      apiErrorMessage(
        { status: 'FETCH_ERROR', error: 'TypeError: Network request failed' },
        FALLBACK,
      ),
    ).toMatch(/could not reach the server/i);
  });

  it('says a request ran out of time', () => {
    expect(apiErrorMessage({ status: 'TIMEOUT_ERROR' }, FALLBACK)).toMatch(
      /took too long/i,
    );
  });

  it('says a reply could not be read, and what it came with', () => {
    expect(
      apiErrorMessage(
        { status: 'PARSING_ERROR', originalStatus: 502, data: '<html>' },
        FALLBACK,
      ),
    ).toMatch(/could not read \(502\)/i);
  });

  it('quotes a bare status when the API refused without a message', () => {
    expect(apiErrorMessage({ status: 413, data: {} }, FALLBACK)).toMatch(/413/);
  });

  it('falls back on anything that carries no failure at all', () => {
    expect(apiErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(new Error('boom'), FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage({ data: { message: '   ' } }, FALLBACK)).toBe(
      FALLBACK,
    );
    expect(apiErrorMessage({ data: { message: 42 } }, FALLBACK)).toBe(FALLBACK);
  });
});
