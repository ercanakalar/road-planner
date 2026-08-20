import { ServiceUnavailableException } from '@nestjs/common';

import { DirectionsService } from './directions.service';
import { PlacesService } from './places.service';
import { RouteSearchService } from './route-search.service';
import { NearbyPlace, RouteSearchRequest } from '../types/maps.types';

const DEGREE_METERS = 111194.93;

const START = { latitude: 0, longitude: 0 };
const END = { latitude: 0.1, longitude: 0 };

const ROUTE = {
  mode: 'driving' as const,
  coordinates: [START, END],
  durationSeconds: 900,
  distanceMeters: 11_200,
};

const place = (
  placeId: string,
  latitude: number,
  longitude: number,
  extra: Partial<NearbyPlace> = {},
): NearbyPlace => ({
  placeId,
  name: placeId,
  address: `${placeId} street`,
  latitude,
  longitude,
  types: ['restaurant'],
  ...extra,
});

const BESIDE_ROUTE = place('beside', 0.05, 0.01);

const OFF_ROUTE = place('off', 0.05, 0.025);

const request = (
  overrides: Partial<RouteSearchRequest> = {},
): RouteSearchRequest => ({
  origin: START,
  destination: END,
  category: 'restaurant',
  radiusMeters: 2000,
  limit: 20,
  sortBy: 'detour',
  ...overrides,
});

describe('RouteSearchService', () => {
  let directions: { route: jest.Mock };
  let places: { nearby: jest.Mock };
  let service: RouteSearchService;

  const nearbyCall = (index = 0) => places.nearby.mock.calls[index][0];

  beforeEach(() => {
    directions = { route: jest.fn().mockResolvedValue(ROUTE) };
    places = { nearby: jest.fn().mockResolvedValue([]) };

    service = new RouteSearchService(
      directions as unknown as DirectionsService,
      places as unknown as PlacesService,
    );
  });

  it('has nothing to search along when there is no route', async () => {
    directions.route.mockResolvedValue(null);

    await expect(service.search(request())).resolves.toBeNull();
    expect(places.nearby).not.toHaveBeenCalled();
  });

  it('has nothing to search along when the route has no shape', async () => {
    directions.route.mockResolvedValue({ ...ROUTE, coordinates: [] });

    await expect(service.search(request())).resolves.toBeNull();
  });

  describe('covering the route', () => {
    it('searches a chain of circles from one end to the other', async () => {
      const result = await service.search(request());

      expect(result?.searchedPoints).toBe(7);
      expect(places.nearby).toHaveBeenCalledTimes(7);
      expect(nearbyCall(0).location).toEqual(START);
      expect(nearbyCall(6).location).toEqual(END);
    });

    it('searches wider than the corridor, so its edges are covered too', async () => {
      await service.search(request());

      expect(nearbyCall().radiusMeters).toBe(3000);
    });

    it('says the whole route was covered when the circles overlap', async () => {
      await expect(service.search(request())).resolves.toMatchObject({
        coversWholeRoute: true,
      });
    });

    it('spreads a long route over the same number of circles', async () => {
      directions.route.mockResolvedValue({
        ...ROUTE,
        coordinates: [START, { latitude: 9, longitude: 0 }],
      });

      const result = await service.search(request());

      expect(result?.searchedPoints).toBe(12);
      expect(places.nearby).toHaveBeenCalledTimes(12);
    });

    it('admits to gaps rather than dragging in places far from the road', async () => {
      directions.route.mockResolvedValue({
        ...ROUTE,
        coordinates: [START, { latitude: 9, longitude: 0 }],
      });

      const result = await service.search(request());

      expect(nearbyCall().radiusMeters).toBe(3000);
      expect(result?.coversWholeRoute).toBe(false);
    });

    it('passes the search itself through to every circle', async () => {
      await service.search(
        request({ keyword: 'kebap', category: 'restaurant', openNow: true }),
      );

      expect(nearbyCall()).toMatchObject({
        keyword: 'kebap',
        category: 'restaurant',
        openNow: true,
      });
    });
  });

  describe('holding the results to the route', () => {
    it('measures how far off the route a place is and how far along', async () => {
      places.nearby.mockResolvedValue([BESIDE_ROUTE]);

      const result = await service.search(request());

      expect(result?.places[0]).toMatchObject({
        placeId: 'beside',
        distanceFromRouteMeters: Math.round(0.01 * DEGREE_METERS),
        distanceAlongRouteMeters: Math.round(0.05 * DEGREE_METERS),
        detourMeters: Math.round(0.02 * DEGREE_METERS),
      });
    });

    it('drops a place the circles reached but the route does not pass', async () => {
      places.nearby.mockResolvedValue([BESIDE_ROUTE, OFF_ROUTE]);

      const result = await service.search(request());

      expect(result?.places.map((found) => found.placeId)).toEqual(['beside']);
    });

    it('counts a place found by several circles once', async () => {
      places.nearby.mockResolvedValue([BESIDE_ROUTE]);

      const result = await service.search(request());

      expect(result?.places).toHaveLength(1);
    });

    it('keeps what Google said about the place', async () => {
      places.nearby.mockResolvedValue([
        place('rated', 0.05, 0.001, {
          rating: 4.6,
          ratingCount: 900,
          priceLevel: 2,
          openNow: true,
        }),
      ]);

      const result = await service.search(request());

      expect(result?.places[0]).toMatchObject({
        name: 'rated',
        rating: 4.6,
        ratingCount: 900,
        priceLevel: 2,
        openNow: true,
      });
    });

    it('places a result after the stop it is passed after', async () => {
      directions.route.mockResolvedValue({
        ...ROUTE,
        coordinates: [START, { latitude: 0.05, longitude: 0 }, END],
      });
      places.nearby.mockResolvedValue([
        place('early', 0.02, 0.001),
        place('late', 0.08, 0.001),
      ]);

      const result = await service.search(
        request({
          waypoints: [{ latitude: 0.05, longitude: 0 }],
          sortBy: 'route',
        }),
      );

      expect(
        result?.places.map(({ placeId, insertAfterIndex }) => [
          placeId,
          insertAfterIndex,
        ]),
      ).toEqual([
        ['early', 0],
        ['late', 1],
      ]);
    });

    it('keeps a result level with an end of the route inside it', async () => {
      places.nearby.mockResolvedValue([
        place('at the start', 0, 0.001),
        place('at the end', 0.1, 0.001),
      ]);

      const result = await service.search(request({ sortBy: 'route' }));

      expect(result?.places.map((found) => found.insertAfterIndex)).toEqual([
        0, 0,
      ]);
    });

    it('reports the route the search was held to', async () => {
      await expect(service.search(request())).resolves.toMatchObject({
        radiusMeters: 2000,
        routeDistanceMeters: 11_200,
        routeDurationSeconds: 900,
        mode: 'driving',
      });
    });
  });

  describe('ordering and trimming', () => {
    const near = place('near', 0.02, 0.002);
    const far = place('far', 0.08, 0.015);

    it('puts the smallest detour first by default', async () => {
      places.nearby.mockResolvedValue([far, near]);

      const result = await service.search(request());

      expect(result?.places.map((found) => found.placeId)).toEqual([
        'near',
        'far',
      ]);
    });

    it('puts them in the order they are driven past when asked', async () => {
      places.nearby.mockResolvedValue([far, near]);

      const result = await service.search(request({ sortBy: 'route' }));

      expect(result?.places.map((found) => found.placeId)).toEqual([
        'near',
        'far',
      ]);
      expect(result?.places[0].distanceAlongRouteMeters).toBeLessThan(
        result!.places[1].distanceAlongRouteMeters,
      );
    });

    it('puts the best rated first when asked, unrated last', async () => {
      places.nearby.mockResolvedValue([
        place('unrated', 0.03, 0.001),
        place('good', 0.04, 0.001, { rating: 4.2, ratingCount: 10 }),
        place('best', 0.05, 0.001, { rating: 4.8, ratingCount: 10 }),
      ]);

      const result = await service.search(request({ sortBy: 'rating' }));

      expect(result?.places.map((found) => found.placeId)).toEqual([
        'best',
        'good',
        'unrated',
      ]);
    });

    it('breaks a tie in rating on how many people rated it', async () => {
      places.nearby.mockResolvedValue([
        place('quiet', 0.03, 0.001, { rating: 4.5, ratingCount: 8 }),
        place('busy', 0.04, 0.001, { rating: 4.5, ratingCount: 800 }),
      ]);

      const result = await service.search(request({ sortBy: 'rating' }));

      expect(result?.places.map((found) => found.placeId)).toEqual([
        'busy',
        'quiet',
      ]);
    });

    it('leaves out anything rated below the floor asked for', async () => {
      places.nearby.mockResolvedValue([
        place('poor', 0.03, 0.001, { rating: 3.1 }),
        place('great', 0.04, 0.001, { rating: 4.7 }),
        place('unrated', 0.05, 0.001),
      ]);

      const result = await service.search(request({ minRating: 4 }));

      expect(result?.places.map((found) => found.placeId)).toEqual(['great']);
    });

    it('returns no more than the caller asked for', async () => {
      places.nearby.mockResolvedValue([
        place('a', 0.02, 0.001),
        place('b', 0.03, 0.002),
        place('c', 0.04, 0.003),
      ]);

      const result = await service.search(request({ limit: 2 }));

      expect(result?.places).toHaveLength(2);
    });
  });

  describe('when Google struggles', () => {
    it('answers with the stretches that did work', async () => {
      places.nearby
        .mockRejectedValueOnce(new ServiceUnavailableException())
        .mockResolvedValue([BESIDE_ROUTE]);

      const result = await service.search(request());

      expect(result?.places.map((found) => found.placeId)).toEqual(['beside']);
    });

    it('fails rather than claiming there is nothing to eat for miles', async () => {
      places.nearby.mockRejectedValue(
        new ServiceUnavailableException('Map service is busy, try again'),
      );

      await expect(service.search(request())).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  it('asks Google once for the same search repeated', async () => {
    await service.search(request());
    await service.search(request());

    expect(directions.route).toHaveBeenCalledTimes(1);
    expect(places.nearby).toHaveBeenCalledTimes(7);
  });

  it('does not answer a search for one thing with another thing', async () => {
    await service.search(request({ keyword: 'kebap' }));
    await service.search(request({ keyword: 'sushi' }));

    expect(places.nearby).toHaveBeenCalledTimes(14);
  });

  it('re-searches when the corridor widens', async () => {
    await service.search(request({ radiusMeters: 2000 }));
    await service.search(request({ radiusMeters: 5000 }));

    expect(places.nearby.mock.calls.length).toBeGreaterThan(7);
  });
});
