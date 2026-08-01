import { API_PREFIX, parseCorsOrigins } from './bootstrap';

describe('API_PREFIX', () => {
  it('is the single source of the route prefix', () => {
    expect(API_PREFIX).toBe('api');
  });
});

describe('parseCorsOrigins', () => {
  it('treats * as "allow any origin"', () => {
    expect(parseCorsOrigins('*')).toBe(true);
  });

  it('tolerates whitespace around *', () => {
    expect(parseCorsOrigins('  *  ')).toBe(true);
  });

  it('parses a single origin into a list', () => {
    expect(parseCorsOrigins('https://app.example.com')).toEqual([
      'https://app.example.com',
    ]);
  });

  it('splits a comma-separated list', () => {
    expect(
      parseCorsOrigins('https://a.example.com,https://b.example.com'),
    ).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('trims whitespace around each origin', () => {
    expect(
      parseCorsOrigins(' https://a.example.com , https://b.example.com '),
    ).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('drops empty entries from a trailing comma', () => {
    expect(parseCorsOrigins('https://a.example.com,,')).toEqual([
      'https://a.example.com',
    ]);
  });

  it('returns an empty allowlist for an empty string rather than allowing all', () => {
    expect(parseCorsOrigins('')).toEqual([]);
  });
});
