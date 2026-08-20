export interface TtlCacheOptions {
  ttlMs: number;
  maxEntries: number;
}

export function createTtlCache<T>({ ttlMs, maxEntries }: TtlCacheOptions) {
  const entries = new Map<string, { value: T; expiresAt: number }>();
  const inFlight = new Map<string, Promise<T>>();

  const store = (key: string, value: T) => {
    entries.delete(key);
    entries.set(key, { value, expiresAt: Date.now() + ttlMs });

    if (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
  };

  const read = (key: string): { value: T } | undefined => {
    const entry = entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return undefined;
    }

    entries.delete(key);
    entries.set(key, entry);

    return { value: entry.value };
  };

  return {
    peek(key: string): { value: T } | undefined {
      return read(key);
    },

    async resolve(key: string, factory: () => Promise<T>): Promise<T> {
      const cached = read(key);
      if (cached) return cached.value;

      const pending = inFlight.get(key);
      if (pending) return pending;

      const request = factory()
        .then((value) => {
          store(key, value);
          return value;
        })
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, request);

      return request;
    },

    get size(): number {
      return entries.size;
    },

    clear(): void {
      entries.clear();
      inFlight.clear();
    },
  };
}
