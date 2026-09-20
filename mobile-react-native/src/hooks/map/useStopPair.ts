import { useCallback, useState } from 'react';

export const nextPair = (previous: string[], id: string): string[] => {
  if (previous.includes(id)) {
    return previous.filter((item) => item !== id);
  }

  return previous.length < 2 ? [...previous, id] : [previous[1], id];
};

export function useStopPair() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelected((previous) => nextPair(previous, id));
  }, []);

  const forget = useCallback((id: string) => {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : previous,
    );
  }, []);

  return { selected, toggle, forget };
}

export default useStopPair;
