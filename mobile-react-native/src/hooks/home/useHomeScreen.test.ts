import { withFavoriteToggled } from './useHomeScreen';
import { DiscoverRoute } from 'types/store/services/routeService-type';

const route = (id: string, isFavorite: boolean): DiscoverRoute => ({
  id,
  title: `Route ${id}`,
  description: '',
  createdAt: '',
  author: 'someone',
  stopCount: 2,
  isFavorite,
  stops: [],
});

describe('withFavoriteToggled', () => {
  it('flips only the route that was tapped', () => {
    const routes = [route('a', false), route('b', true)];

    const next = withFavoriteToggled(routes, 'a');

    expect(next.map((item) => item.isFavorite)).toEqual([true, true]);
  });

  it('unstars a route that was already saved', () => {
    expect(withFavoriteToggled([route('a', true)], 'a')[0].isFavorite).toBe(
      false,
    );
  });

  it('leaves the cached routes untouched', () => {
    // The optimistic copy is handed straight to the list, so aliasing the
    // cached objects would edit RTK Query's cache from the screen.
    const routes = [route('a', false)];

    const next = withFavoriteToggled(routes, 'a');

    expect(routes[0].isFavorite).toBe(false);
    expect(next[0]).not.toBe(routes[0]);
  });

  it('is a no-op for a route that is no longer in the sample', () => {
    const routes = [route('a', false)];

    expect(withFavoriteToggled(routes, 'gone')).toEqual(routes);
  });
});
