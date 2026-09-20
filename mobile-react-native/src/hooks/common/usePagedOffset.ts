import { useCallback, useState } from 'react';

export function usePagedOffset(question: string, step: number) {
  const [state, setState] = useState({ question, offset: 0 });

  if (state.question !== question) {
    setState({ question, offset: 0 });
  }

  const offset = state.question === question ? state.offset : 0;

  const loadNextPage = useCallback(
    () =>
      setState((previous) => ({
        ...previous,
        offset: previous.offset + step,
      })),
    [step],
  );

  const reset = useCallback(
    () => setState((previous) => ({ ...previous, offset: 0 })),
    [],
  );

  return [offset, loadNextPage, reset] as const;
}

export default usePagedOffset;
