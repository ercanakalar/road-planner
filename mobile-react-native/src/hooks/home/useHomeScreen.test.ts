import { withFavoriteToggled } from './useHomeScreen';
import { DiscoverRoad } from 'types/store/services/roadService-type';

const road = (id: string, isFavorite: boolean): DiscoverRoad => ({
  id,
  title: `Road ${id}`,
  description: '',
  createdAt: '',
  author: 'someone',
  stopCount: 2,
  isFavorite,
  wayPoints: [],
});

describe('withFavoriteToggled', () => {
  it('flips only the road that was tapped', () => {
    const roads = [road('a', false), road('b', true)];

    const next = withFavoriteToggled(roads, 'a');

    expect(next.map((item) => item.isFavorite)).toEqual([true, true]);
  });

  it('unstars a road that was already saved', () => {
    expect(withFavoriteToggled([road('a', true)], 'a')[0].isFavorite).toBe(
      false,
    );
  });

  it('leaves the cached roads untouched', () => {
    // The optimistic copy is handed straight to the list, so aliasing the
    // cached objects would edit RTK Query's cache from the screen.
    const roads = [road('a', false)];

    const next = withFavoriteToggled(roads, 'a');

    expect(roads[0].isFavorite).toBe(false);
    expect(next[0]).not.toBe(roads[0]);
  });

  it('is a no-op for a road that is no longer in the sample', () => {
    const roads = [road('a', false)];

    expect(withFavoriteToggled(roads, 'gone')).toEqual(roads);
  });
});
