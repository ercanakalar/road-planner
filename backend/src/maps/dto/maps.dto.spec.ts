import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import {
  DirectionsDto,
  DurationsDto,
  DurationsQueryDto,
  PlaceDetailsQueryDto,
  PlaceSearchQueryDto,
  ReverseGeocodeQueryDto,
  ROUTE_SEARCH_RADIUS_MAX,
  ROUTE_SEARCH_RADIUS_MIN,
  ROUTE_WAYPOINTS_MAX,
  RouteQueryDto,
  RouteSearchDto,
} from './maps.dto';

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784 };
const ANKARA = { latitude: 39.9334, longitude: 32.8597 };

const route = (overrides: Record<string, unknown> = {}) => ({
  origin: ISTANBUL,
  destination: ANKARA,
  ...overrides,
});

describe('DirectionsDto', () => {
  it('accepts a two-point route', async () => {
    await expect(collectDtoErrors(DirectionsDto, route())).resolves.toEqual([]);
  });

  it('accepts a route with stops and a mode', async () => {
    await expect(
      collectDtoErrors(
        DirectionsDto,
        route({ waypoints: [ISTANBUL], mode: 'walking', optimize: true }),
      ),
    ).resolves.toEqual([]);
  });

  it.each(['origin', 'destination'])('requires a %s', async (field) => {
    const payload = route() as Record<string, unknown>;
    delete payload[field];

    await expect(collectDtoErrors(DirectionsDto, payload)).resolves.not.toEqual(
      [],
    );
  });

  it.each([
    ['latitude', 91],
    ['latitude', -91],
    ['longitude', 181],
    ['longitude', -181],
  ])('rejects an out-of-range %s of %p', async (field, value) => {
    await expect(
      collectDtoErrors(
        DirectionsDto,
        route({ origin: { ...ISTANBUL, [field]: value } }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('rejects a coordinate that is not a number', async () => {
    await expect(
      collectDtoErrors(
        DirectionsDto,
        route({ origin: { latitude: 'north', longitude: 1 } }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('rejects a mode Google does not offer', async () => {
    await expect(
      collectDtoErrors(DirectionsDto, route({ mode: 'teleport' })),
    ).resolves.not.toEqual([]);
  });

  it(`rejects more than ${ROUTE_WAYPOINTS_MAX} stops, which Google would refuse`, async () => {
    await expect(
      collectDtoErrors(
        DirectionsDto,
        route({
          waypoints: Array.from(
            { length: ROUTE_WAYPOINTS_MAX + 1 },
            () => ISTANBUL,
          ),
        }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('strips anything the caller sends beyond the contract', async () => {
    const result = await validateDto(
      DirectionsDto,
      route({ key: 'someone-elses-api-key' }),
    );

    expect(result).not.toHaveProperty('key');
  });
});

describe('DurationsDto', () => {
  it('accepts a route with no modes, meaning all of them', async () => {
    await expect(collectDtoErrors(DurationsDto, route())).resolves.toEqual([]);
  });

  it('accepts a chosen list of modes', async () => {
    await expect(
      collectDtoErrors(DurationsDto, route({ modes: ['driving', 'transit'] })),
    ).resolves.toEqual([]);
  });

  it('rejects an empty list, which asks for nothing', async () => {
    await expect(
      collectDtoErrors(DurationsDto, route({ modes: [] })),
    ).resolves.not.toEqual([]);
  });

  it('rejects an unknown mode in the list', async () => {
    await expect(
      collectDtoErrors(DurationsDto, route({ modes: ['driving', 'flying'] })),
    ).resolves.not.toEqual([]);
  });
});

describe('ReverseGeocodeQueryDto', () => {
  it('parses coordinates that arrive as query strings', async () => {
    await expect(
      validateDto(ReverseGeocodeQueryDto, {
        latitude: '41.0082',
        longitude: '28.9784',
      }),
    ).resolves.toEqual({ latitude: 41.0082, longitude: 28.9784 });
  });

  it('rejects a coordinate that is not a number at all', async () => {
    await expect(
      collectDtoErrors(ReverseGeocodeQueryDto, {
        latitude: 'north',
        longitude: '28.9784',
      }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a missing coordinate', async () => {
    await expect(
      collectDtoErrors(ReverseGeocodeQueryDto, { latitude: '41.0082' }),
    ).resolves.not.toEqual([]);
  });
});

describe('RouteQueryDto', () => {
  it('accepts an empty query, meaning the default mode', async () => {
    await expect(collectDtoErrors(RouteQueryDto, {})).resolves.toEqual([]);
  });

  it('rejects an unknown mode', async () => {
    await expect(
      collectDtoErrors(RouteQueryDto, { mode: 'flying' }),
    ).resolves.not.toEqual([]);
  });
});

describe('DurationsQueryDto', () => {
  it('splits a comma separated list of modes', async () => {
    await expect(
      validateDto(DurationsQueryDto, { modes: 'driving,transit' }),
    ).resolves.toEqual({ modes: ['driving', 'transit'] });
  });

  it('ignores the spacing someone typed', async () => {
    await expect(
      validateDto(DurationsQueryDto, { modes: 'driving, walking' }),
    ).resolves.toEqual({ modes: ['driving', 'walking'] });
  });

  it('accepts no modes at all', async () => {
    await expect(collectDtoErrors(DurationsQueryDto, {})).resolves.toEqual([]);
  });

  it('rejects an unknown mode in the list', async () => {
    await expect(
      collectDtoErrors(DurationsQueryDto, { modes: 'driving,flying' }),
    ).resolves.not.toEqual([]);
  });
});

describe('PlaceSearchQueryDto', () => {
  it('accepts a search with a session token', async () => {
    await expect(
      collectDtoErrors(PlaceSearchQueryDto, {
        input: 'kadikoy',
        sessionToken: 'abc',
      }),
    ).resolves.toEqual([]);
  });

  it('trims what was typed', async () => {
    await expect(
      validateDto(PlaceSearchQueryDto, { input: '  kadikoy  ' }),
    ).resolves.toMatchObject({ input: 'kadikoy' });
  });

  it('rejects a query too short to be worth a billed request', async () => {
    await expect(
      collectDtoErrors(PlaceSearchQueryDto, { input: 'k' }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a missing query', async () => {
    await expect(
      collectDtoErrors(PlaceSearchQueryDto, {}),
    ).resolves.not.toEqual([]);
  });
});

describe('PlaceDetailsQueryDto', () => {
  it('accepts a lookup with no session token', async () => {
    await expect(collectDtoErrors(PlaceDetailsQueryDto, {})).resolves.toEqual(
      [],
    );
  });
});

describe('RouteSearchDto', () => {
  it('accepts a search for a kind of place along a route', async () => {
    await expect(
      collectDtoErrors(RouteSearchDto, route({ category: 'restaurant' })),
    ).resolves.toEqual([]);
  });

  it('accepts a search for whatever was typed', async () => {
    await expect(
      collectDtoErrors(RouteSearchDto, route({ query: 'sushi' })),
    ).resolves.toEqual([]);
  });

  it('rejects a search with nothing to search for', async () => {
    await expect(collectDtoErrors(RouteSearchDto, route())).resolves.toEqual([
      'give a query, a category, or both to search for',
    ]);
  });

  it('rejects a query too short to be worth a dozen billed requests', async () => {
    await expect(
      collectDtoErrors(RouteSearchDto, route({ query: 'a' })),
    ).resolves.not.toEqual([]);
  });

  it('still checks the query when a category is given too', async () => {
    await expect(
      collectDtoErrors(
        RouteSearchDto,
        route({ category: 'cafe', query: 'a'.repeat(300) }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('reads a whitespace-only query as no query at all', async () => {
    await expect(
      collectDtoErrors(
        RouteSearchDto,
        route({ category: 'cafe', query: '   ' }),
      ),
    ).resolves.toEqual([]);
  });

  it('trims what was typed', async () => {
    await expect(
      validateDto(RouteSearchDto, route({ query: '  sushi  ' })),
    ).resolves.toMatchObject({ query: 'sushi' });
  });

  it('rejects a category Google has no such type for', async () => {
    await expect(
      collectDtoErrors(RouteSearchDto, route({ category: 'wormhole' })),
    ).resolves.not.toEqual([]);
  });

  it('accepts the stops along the way', async () => {
    await expect(
      collectDtoErrors(
        RouteSearchDto,
        route({ category: 'cafe', waypoints: [ISTANBUL] }),
      ),
    ).resolves.toEqual([]);
  });

  it('takes a radius as a number in a string, since forms send strings', async () => {
    await expect(
      validateDto(
        RouteSearchDto,
        route({ category: 'cafe', radiusMeters: '1500' }),
      ),
    ).resolves.toMatchObject({ radiusMeters: 1500 });
  });

  it('rejects a corridor too narrow for the route line to be accurate to', async () => {
    await expect(
      collectDtoErrors(
        RouteSearchDto,
        route({ category: 'cafe', radiusMeters: ROUTE_SEARCH_RADIUS_MIN - 1 }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('rejects a corridor so wide it stops meaning "along the route"', async () => {
    await expect(
      collectDtoErrors(
        RouteSearchDto,
        route({ category: 'cafe', radiusMeters: ROUTE_SEARCH_RADIUS_MAX + 1 }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('reads the open-now flag out of a query string', async () => {
    await expect(
      validateDto(RouteSearchDto, route({ category: 'cafe', openNow: 'true' })),
    ).resolves.toMatchObject({ openNow: true });
  });

  it('rejects a rating floor off the five point scale', async () => {
    await expect(
      collectDtoErrors(
        RouteSearchDto,
        route({ category: 'cafe', minRating: 6 }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('rejects a limit that is not a whole number of places', async () => {
    await expect(
      collectDtoErrors(RouteSearchDto, route({ category: 'cafe', limit: 2.5 })),
    ).resolves.not.toEqual([]);
  });

  it('rejects a limit large enough to page through a city', async () => {
    await expect(
      collectDtoErrors(RouteSearchDto, route({ category: 'cafe', limit: 500 })),
    ).resolves.not.toEqual([]);
  });

  it('rejects an ordering it has no way to sort by', async () => {
    await expect(
      collectDtoErrors(
        RouteSearchDto,
        route({ category: 'cafe', sortBy: 'price' }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('rejects a search with no route to search along', async () => {
    await expect(
      collectDtoErrors(RouteSearchDto, { category: 'cafe' }),
    ).resolves.not.toEqual([]);
  });
});
