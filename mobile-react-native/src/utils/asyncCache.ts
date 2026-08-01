export function createAsyncCache<T>(maxEntries = 40) {
  const settled = new Map<string, T>();
  const inFlight = new Map<string, Promise<T>>();

  const touch = (key: string, value: T) => {
    settled.delete(key);
    settled.set(key, value);
    if (settled.size > maxEntries) {
      const oldest = settled.keys().next().value;
      if (oldest !== undefined) settled.delete(oldest);
    }
  };

  return {
    peek(key: string): T | undefined {
      const value = settled.get(key);
      if (value !== undefined) touch(key, value);
      return value;
    },

    async resolve(key: string, factory: () => Promise<T>): Promise<T> {
      const cached = settled.get(key);
      if (cached !== undefined) {
        touch(key, cached);
        return cached;
      }

      const pending = inFlight.get(key);
      if (pending) return pending;

      const request = factory()
        .then((value) => {
          if (value !== undefined && value !== null) touch(key, value);
          return value;
        })
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, request);
      return request;
    },

    clear() {
      settled.clear();
      inFlight.clear();
    },
  };
}

export type AsyncCache<T> = ReturnType<typeof createAsyncCache<T>>;
