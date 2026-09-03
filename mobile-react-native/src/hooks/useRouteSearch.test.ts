import { toRouteSearchRequest } from './useRouteSearch';
import { WaypointWithAddress } from 'types/map-screen-type';

const stop = (latitude: number, longitude: number): WaypointWithAddress => ({
  id: `${latitude}`,
  latitude,
  longitude,
  order: 1,
  roadId: 'road',
  address: 'Somewhere, Fatih, İstanbul, TR',
  createdAt: '',
  updatedAt: '',
  favoriteWaypoints: [],
});

const ISTANBUL = stop(41.0082, 28.9784);
const IZMIT = stop(40.7654, 29.9408);
const ANKARA = stop(39.9334, 32.8597);

const inputs = {
  category: 'restaurant',
  radiusMeters: 2000,
  sortBy: 'detour' as const,
  openNow: false,
  mode: 'driving' as const,
};

describe('toRouteSearchRequest', () => {
  it('sends the ends of the journey and the stops between them', () => {
    const request = toRouteSearchRequest([ISTANBUL, IZMIT, ANKARA], inputs);

    expect(request).toMatchObject({
      origin: { latitude: 41.0082, longitude: 28.9784 },
      destination: { latitude: 39.9334, longitude: 32.8597 },
      waypoints: [{ latitude: 40.7654, longitude: 29.9408 }],
    });
  });

  it('sends coordinates only, not whole waypoints', () => {
    const request = toRouteSearchRequest([ISTANBUL, ANKARA], inputs);

    expect(Object.keys(request!.origin)).toEqual(['latitude', 'longitude']);
  });

  it('has nothing to search along with only one stop', () => {
    expect(toRouteSearchRequest([ISTANBUL], inputs)).toBeNull();
  });

  it('has nothing to search for without a query or a category', () => {
    expect(
      toRouteSearchRequest([ISTANBUL, ANKARA], {
        ...inputs,
        category: undefined,
      }),
    ).toBeNull();
  });

  it('does not search on a query still being typed', () => {
    expect(
      toRouteSearchRequest([ISTANBUL, ANKARA], {
        ...inputs,
        category: undefined,
        query: 's',
      }),
    ).toBeNull();
  });

  it('searches on a query once it is long enough to mean something', () => {
    expect(
      toRouteSearchRequest([ISTANBUL, ANKARA], {
        ...inputs,
        category: undefined,
        query: 'sushi',
      }),
    ).toMatchObject({ query: 'sushi' });
  });

  it('trims what was typed', () => {
    expect(
      toRouteSearchRequest([ISTANBUL, ANKARA], {
        ...inputs,
        query: '  sushi  ',
      }),
    ).toMatchObject({ query: 'sushi' });
  });

  it('sends a query and a category together when both are set', () => {
    expect(
      toRouteSearchRequest([ISTANBUL, ANKARA], { ...inputs, query: 'sushi' }),
    ).toMatchObject({ query: 'sushi', category: 'restaurant' });
  });

  it('leaves out the filters that are not switched on', () => {
    const request = toRouteSearchRequest([ISTANBUL, ANKARA], inputs);

    expect(request).not.toHaveProperty('query');
    expect(request).not.toHaveProperty('openNow');
  });

  it('carries the corridor, the ordering and the mode', () => {
    expect(
      toRouteSearchRequest([ISTANBUL, ANKARA], {
        ...inputs,
        radiusMeters: 5000,
        sortBy: 'rating',
        openNow: true,
        mode: 'walking',
      }),
    ).toMatchObject({
      radiusMeters: 5000,
      sortBy: 'rating',
      openNow: true,
      mode: 'walking',
    });
  });
});
