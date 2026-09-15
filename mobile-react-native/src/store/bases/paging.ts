import { Page } from 'types/store/bases';

/**
 * The cache key for a paged list: everything about the question except how far
 * down it the caller has scrolled.
 *
 * Every page of one list therefore lands in a single cache entry, which is what
 * lets `appendPage` add to it. Changing the term, the order or a filter is a
 * different question and gets an entry of its own, so going back to a previous
 * one shows what it showed before rather than starting over.
 */
export const pagedCacheKey = <Args extends { offset?: number }>({
  endpointName,
  queryArgs,
}: {
  endpointName: string;
  queryArgs: Args;
}): string => {
  const { offset: _offset, ...question } = queryArgs;

  // Sorted so the key does not depend on the order the caller happened to
  // spell the arguments in.
  const keys = Object.keys(question).sort();

  return `${endpointName}(${JSON.stringify(question, keys)})`;
};

/**
 * Appends the next page to what is already on screen.
 *
 * The de-duplication is not paranoia: rows are ordered by fields that keep
 * changing — the newest first, the most saved first — so a route published or
 * favourited between two requests shifts everything after it by one, and the
 * same row can arrive twice under two different offsets. Without this the list
 * renders duplicate keys and drops rows.
 *
 * An answer at offset zero replaces rather than appends: that is the first page
 * of a list being read again, not more of one.
 */
export const appendPage = <T extends { id: string }>(
  current: Page<T>,
  incoming: Page<T>,
  offset?: number,
): Page<T> => {
  if (!offset || offset <= 0) return incoming;

  const seen = new Set(current.items.map((item) => item.id));

  return {
    items: [
      ...current.items,
      ...incoming.items.filter((item) => !seen.has(item.id)),
    ],
    // Both counts describe the whole result, not this page, so the newest
    // answer is the right one.
    total: incoming.total,
    hasMore: incoming.hasMore,
  };
};

/** A page boundary is the only reason to ask the same question twice. */
export const refetchOnNewPage = ({
  currentArg,
  previousArg,
}: {
  currentArg?: { offset?: number };
  previousArg?: { offset?: number };
}): boolean => (currentArg?.offset ?? 0) !== (previousArg?.offset ?? 0);
