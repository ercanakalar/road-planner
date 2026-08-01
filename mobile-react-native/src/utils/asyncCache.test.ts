import { createAsyncCache } from './asyncCache';

const deferredValue = <T>(value: T, calls: { count: number }) => async () => {
  calls.count += 1;
  await new Promise((resolve) => setTimeout(resolve, 5));
  return value;
};

describe('createAsyncCache', () => {
  it('shares one request between concurrent callers of the same key', async () => {
    const calls = { count: 0 };
    const cache = createAsyncCache<string>();

    const [first, second] = await Promise.all([
      cache.resolve('k', deferredValue('A', calls)),
      cache.resolve('k', deferredValue('A', calls)),
    ]);

    expect([first, second]).toEqual(['A', 'A']);
    expect(calls.count).toBe(1);
  });

  it('answers a repeated key from memory', async () => {
    const calls = { count: 0 };
    const cache = createAsyncCache<string>();

    await cache.resolve('k', deferredValue('A', calls));
    await cache.resolve('k', deferredValue('A', calls));

    expect(calls.count).toBe(1);
  });

  it('evicts the least recently used entry past its bound', async () => {
    const calls = { count: 0 };
    const cache = createAsyncCache<string>(2);

    await cache.resolve('a', deferredValue('A', calls));
    await cache.resolve('b', deferredValue('B', calls));
    await cache.resolve('c', deferredValue('C', calls));

    expect(cache.peek('a')).toBeUndefined();
    expect(cache.peek('b')).toBe('B');
    expect(cache.peek('c')).toBe('C');
  });

  it('counts a read as a use, so a hot key is not evicted', async () => {
    const calls = { count: 0 };
    const cache = createAsyncCache<string>(2);

    await cache.resolve('a', deferredValue('A', calls));
    await cache.resolve('b', deferredValue('B', calls));
    cache.peek('a');
    await cache.resolve('c', deferredValue('C', calls));

    expect(cache.peek('a')).toBe('A');
    expect(cache.peek('b')).toBeUndefined();
  });

  it('does not cache a null result, so a failed lookup is retried', async () => {
    const calls = { count: 0 };
    const cache = createAsyncCache<string | null>();

    await cache.resolve('k', deferredValue(null, calls));
    await cache.resolve('k', deferredValue(null, calls));

    expect(calls.count).toBe(2);
  });

  it('releases the in-flight slot when a request rejects', async () => {
    const cache = createAsyncCache<string>();
    const failing = () => Promise.reject(new Error('boom'));

    await expect(cache.resolve('k', failing)).rejects.toThrow('boom');
    await expect(cache.resolve('k', async () => 'A')).resolves.toBe('A');
  });
});
