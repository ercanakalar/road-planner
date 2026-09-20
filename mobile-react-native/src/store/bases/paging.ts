import { Page } from 'types/store/bases';

export const pagedCacheKey = <Args extends { offset?: number }>({
  endpointName,
  queryArgs,
}: {
  endpointName: string;
  queryArgs: Args;
}): string => {
  const { offset: _offset, ...question } = queryArgs;

  const keys = Object.keys(question).sort();

  return `${endpointName}(${JSON.stringify(question, keys)})`;
};

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
    total: incoming.total,
    hasMore: incoming.hasMore,
  };
};

export const refetchOnNewPage = ({
  currentArg,
  previousArg,
}: {
  currentArg?: { offset?: number };
  previousArg?: { offset?: number };
}): boolean => (currentArg?.offset ?? 0) !== (previousArg?.offset ?? 0);
