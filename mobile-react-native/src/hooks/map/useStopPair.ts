import { useCallback, useState } from 'react';

/**
 * Adds or removes a stop from the compared pair.
 *
 * Order is the meaning here: the first entry is A, the second is B, so a pick
 * appends rather than sorting. Picking a third pushes the oldest out instead of
 * being ignored, which keeps the pair following the taps rather than going dead
 * once it is full.
 */
export const nextPair = (previous: string[], id: string): string[] => {
  if (previous.includes(id)) {
    return previous.filter((item) => item !== id);
  }

  return previous.length < 2 ? [...previous, id] : [previous[1], id];
};

/**
 * The two stops the user is comparing, held in the order they were picked.
 *
 * This lives above both the map and the list because each has to show the same
 * pair: the list badges them A and B, and the map colours those two pins to
 * match.
 */
export function useStopPair() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelected((previous) => nextPair(previous, id));
  }, []);

  /**
   * Drops a stop that no longer exists, so a deleted stop cannot stay
   * selected. Returns the same array when there is nothing to drop, so removing
   * an unselected stop does not re-render the map.
   */
  const forget = useCallback((id: string) => {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : previous,
    );
  }, []);

  return { selected, toggle, forget };
}

export default useStopPair;
