import { createTtlCache } from './ttl-cache';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

describe('createTtlCache', () => {
  const options = { ttlMs: 1000, maxEntries: 3 };

  it('calls the factory once for repeated reads of the same key', async () => {
    const cache = createTtlCache<string>(options);
    const factory = jest.fn().mockResolvedValue('route');

    await cache.resolve('a', factory);
    await cache.resolve('a', factory);

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('caches a null answer, so an unroutable pair is not asked twice', async () => {
    const cache = createTtlCache<string | null>(options);
    const factory = jest.fn().mockResolvedValue(null);

    await expect(cache.resolve('a', factory)).resolves.toBeNull();
    await expect(cache.resolve('a', factory)).resolves.toBeNull();

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight request between concurrent callers', async () => {
    const cache = createTtlCache<string>(options);
    const { promise, resolve } = deferred<string>();
    const factory = jest.fn().mockReturnValue(promise);

    const first = cache.resolve('a', factory);
    const second = cache.resolve('a', factory);

    resolve('route');

    await expect(Promise.all([first, second])).resolves.toEqual([
      'route',
      'route',
    ]);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed request rather than caching the failure', async () => {
    const cache = createTtlCache<string>(options);
    const factory = jest
      .fn()
      .mockRejectedValueOnce(new Error('upstream'))
      .mockResolvedValueOnce('route');

    await expect(cache.resolve('a', factory)).rejects.toThrow('upstream');
    await expect(cache.resolve('a', factory)).resolves.toBe('route');
  });

  it('expires an entry once its ttl has passed', async () => {
    jest.useFakeTimers();

    try {
      const cache = createTtlCache<string>(options);
      const factory = jest.fn().mockResolvedValue('route');

      await cache.resolve('a', factory);
      jest.advanceTimersByTime(options.ttlMs + 1);
      await cache.resolve('a', factory);

      expect(factory).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('drops the least recently used entry past the size limit', async () => {
    const cache = createTtlCache<string>(options);
    const factory = (value: string) => jest.fn().mockResolvedValue(value);

    await cache.resolve('a', factory('a'));
    await cache.resolve('b', factory('b'));
    await cache.resolve('c', factory('c'));

    await cache.resolve('a', factory('a'));
    await cache.resolve('d', factory('d'));

    expect(cache.peek('b')).toBeUndefined();
    expect(cache.peek('a')).toEqual({ value: 'a' });
    expect(cache.size).toBe(options.maxEntries);
  });

  it('reports a miss and a cached null differently', async () => {
    const cache = createTtlCache<string | null>(options);

    await cache.resolve('a', () => Promise.resolve(null));

    expect(cache.peek('a')).toEqual({ value: null });
    expect(cache.peek('never-asked')).toBeUndefined();
  });

  it('forgets everything when cleared', async () => {
    const cache = createTtlCache<string>(options);

    await cache.resolve('a', () => Promise.resolve('route'));
    cache.clear();

    expect(cache.peek('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });
});
