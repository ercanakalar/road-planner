import { useCallback, useState } from 'react';

/**
 * How far down one list the reader has asked to go, forgotten as soon as the
 * question changes.
 *
 * `question` is whatever decides which list this is — the term, the order, the
 * filters. When it changes the offset returns to zero, because page four of a
 * search nobody is running any more is not a page of anything.
 *
 * That reset happens during render rather than in an effect on purpose. An
 * effect runs after the render that already asked for page four of the new
 * search, so the wrong request goes out, comes back, and is thrown away — and
 * on a list whose first page has not arrived yet, the offset that lands in the
 * cache entry is the wrong one. Re-rendering with corrected state instead is
 * React's own answer to state that is derived from something above it.
 */
export function usePagedOffset(question: string, step: number) {
  const [state, setState] = useState({ question, offset: 0 });

  if (state.question !== question) {
    setState({ question, offset: 0 });
  }

  // Until that re-render lands, the offset belonging to this question is zero.
  const offset = state.question === question ? state.offset : 0;

  const loadNextPage = useCallback(
    () =>
      setState((previous) => ({
        ...previous,
        offset: previous.offset + step,
      })),
    [step],
  );

  /** Back to the first page, which is what pulling a list down asks for. */
  const reset = useCallback(
    () => setState((previous) => ({ ...previous, offset: 0 })),
    [],
  );

  return [offset, loadNextPage, reset] as const;
}

export default usePagedOffset;
