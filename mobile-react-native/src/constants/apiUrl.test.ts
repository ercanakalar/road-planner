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

describe('an address the app cannot use', () => {
  it('refuses a host carrying two ports', () => {
    expect(() => apiBaseUrl('http://10.198.226.199:8081:3000')).toThrow(
      /not a valid address/i,
    );
  });

  it('names the variable to fix, and shows what was in it', () => {
    expect(() => apiBaseUrl('http://10.0.0.1:8081:3000')).toThrow(
      /EXPO_PUBLIC_BASE_URL.*10\.0\.0\.1:8081:3000/s,
    );
  });

  it('refuses an address with no host', () => {
    expect(() => apiBaseUrl('http://:3000')).toThrow(/not a valid address/i);
  });

  it.each(['', '   '])('refuses %p', (raw) => {
    expect(() => apiBaseUrl(raw)).toThrow(/is empty/i);
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
