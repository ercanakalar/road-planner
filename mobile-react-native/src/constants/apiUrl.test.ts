import { apiBaseUrl, apiOrigin } from './apiUrl';

describe('apiBaseUrl', () => {
  it('adds the prefix every backend route lives under', () => {
    expect(apiBaseUrl('http://192.168.1.20:3000')).toBe(
      'http://192.168.1.20:3000/api',
    );
  });

  it('does not add it twice when the address already carries it', () => {
    expect(apiBaseUrl('http://192.168.1.20:3000/api')).toBe(
      'http://192.168.1.20:3000/api',
    );
  });

  it.each([
    'http://192.168.1.20:3000/',
    'http://192.168.1.20:3000/api/',
    '  http://192.168.1.20:3000  ',
  ])('tolerates %p', (raw) => {
    expect(apiBaseUrl(raw)).toBe('http://192.168.1.20:3000/api');
  });

  it('leaves a path that is not the prefix alone', () => {
    expect(apiBaseUrl('https://example.com/travel-routes')).toBe(
      'https://example.com/travel-routes/api',
    );
  });
});

describe('apiOrigin', () => {
  it('is the address without the prefix, however it was written', () => {
    expect(apiOrigin('http://192.168.1.20:3000')).toBe(
      'http://192.168.1.20:3000',
    );
    expect(apiOrigin('http://192.168.1.20:3000/api')).toBe(
      'http://192.168.1.20:3000',
    );
    expect(apiOrigin('http://192.168.1.20:3000/api/')).toBe(
      'http://192.168.1.20:3000',
    );
  });
});
