import { hashEmail } from './subject-hash';

const KEY = 'audit-key-that-is-long-enough-for-tests-0';

describe('hashEmail', () => {
  it('finds the same record however the address is typed', () => {
    expect(hashEmail('  Ada@Example.com ', KEY)).toBe(
      hashEmail('ada@example.com', KEY),
    );
  });

  it('keeps nothing of the address itself', () => {
    const hash = hashEmail('ada@example.com', KEY);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('ada');
  });

  it('depends on the key, so the log cannot be matched without it', () => {
    expect(hashEmail('ada@example.com', KEY)).not.toBe(
      hashEmail('ada@example.com', `${KEY}-other`),
    );
  });
});
