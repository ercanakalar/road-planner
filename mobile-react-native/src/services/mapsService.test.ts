jest.mock('services/tokenStorage', () => ({
  __esModule: true,
  default: { getAccessToken: jest.fn() },
}));

import tokenStorage from 'services/tokenStorage';

const getAccessToken = tokenStorage.getAccessToken as jest.Mock;

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784 };
const ANKARA = { latitude: 39.9334, longitude: 32.8597 };

const envelope = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ status: 'success', data }),
});

const ROUTE = {
  coordinates: [ISTANBUL, ANKARA],
  durationSeconds: 1800,
  distanceMeters: 45_000,
};

const loadService = () => {
  let service!: typeof import('./mapsService');
  jest.isolateModules(() => {
    service = require('./mapsService');
  });
  return service;
};

describe('mapsService', () => {
  let fetchMock: jest.Mock;

  const requestedUrl = (call = 0) => new URL(String(fetchMock.mock.calls[call][0]));
  const requestInit = (call = 0) => fetchMock.mock.calls[call][1];
  const requestBody = (call = 0) => JSON.parse(requestInit(call).body);

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(envelope(null));
    global.fetch = fetchMock as unknown as typeof fetch;

    getAccessToken.mockResolvedValue('access-token');
  });

  describe('addressing the backend', () => {
    it('asks our own API, never Google', async () => {
      fetchMock.mockResolvedValue(envelope(ROUTE));

      await loadService().fetchDirections({
        origin: ISTANBUL,
        destination: ANKARA,
      });

      expect(requestedUrl().host).not.toContain('googleapis');
      expect(requestedUrl().pathname).toBe('/api/maps/directions');
    });

    it('sends the access token when there is one', async () => {
      await loadService().reverseGeocode(ISTANBUL);

      expect(requestInit().headers).toMatchObject({
        Authorization: 'Bearer access-token',
      });
    });

    it('still asks when signed out, since the endpoints are public', async () => {
      getAccessToken.mockResolvedValue(null);

      await loadService().reverseGeocode(ISTANBUL);

      expect(requestInit().headers).not.toHaveProperty('Authorization');
      expect(fetchMock).toHaveBeenCalled();
    });

    it('unwraps the envelope the API answers with', async () => {
      fetchMock.mockResolvedValue(envelope(ROUTE));

      await expect(
        loadService().fetchDirections({
          origin: ISTANBUL,
          destination: ANKARA,
        }),
      ).resolves.toEqual(ROUTE);
    });

    it('raises a failed request rather than returning an empty route', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      });

      await expect(
        loadService().fetchDirections({
          origin: ISTANBUL,
          destination: ANKARA,
        }),
      ).rejects.toThrow('Request failed with status 503');
    });
  });

  describe('fetchDirections', () => {
    it('posts the journey as coordinates', async () => {
      fetchMock.mockResolvedValue(envelope(ROUTE));

      await loadService().fetchDirections({
        origin: ISTANBUL,
        destination: ANKARA,
        waypoints: [ISTANBUL],
        mode: 'walking',
      });

      expect(requestBody()).toEqual({
        origin: ISTANBUL,
        destination: ANKARA,
        waypoints: [ISTANBUL],
        mode: 'walking',
      });
    });

    it('asks once for the same journey', async () => {
      fetchMock.mockResolvedValue(envelope(ROUTE));
      const service = loadService();

      await service.fetchDirections({ origin: ISTANBUL, destination: ANKARA });
      await service.fetchDirections({ origin: ISTANBUL, destination: ANKARA });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('asks again for a different mode', async () => {
      fetchMock.mockResolvedValue(envelope(ROUTE));
      const service = loadService();

      await service.fetchDirections({
        origin: ISTANBUL,
        destination: ANKARA,
        mode: 'driving',
      });
      await service.fetchDirections({
        origin: ISTANBUL,
        destination: ANKARA,
        mode: 'transit',
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('serves a cached route from peekDirections', async () => {
      fetchMock.mockResolvedValue(envelope(ROUTE));
      const service = loadService();
      const journey = { origin: ISTANBUL, destination: ANKARA };

      expect(service.peekDirections(journey)).toBeUndefined();
      await service.fetchDirections(journey);

      expect(service.peekDirections(journey)).toEqual(ROUTE);
    });
  });

  describe('fetchTerrain', () => {
    const SHAPES = [null, { slopeGrade: 'gentle' }];

    it('posts the stops in order, with the mode', async () => {
      fetchMock.mockResolvedValue(envelope(SHAPES));

      await loadService().fetchTerrain([ISTANBUL, ANKARA], 'driving');

      expect(requestedUrl().pathname).toContain('/road/terrain');
      expect(requestBody()).toEqual({
        stops: [ISTANBUL, ANKARA],
        mode: 'driving',
      });
    });

    it('asks once for the same points', async () => {
      fetchMock.mockResolvedValue(envelope(SHAPES));
      const service = loadService();

      await service.fetchTerrain([ISTANBUL, ANKARA], 'driving');
      await service.fetchTerrain([ISTANBUL, ANKARA], 'driving');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('asks again once a stop has moved', async () => {
      fetchMock.mockResolvedValue(envelope(SHAPES));
      const service = loadService();

      await service.fetchTerrain([ISTANBUL, ANKARA], 'driving');
      await service.fetchTerrain(
        [ISTANBUL, { ...ANKARA, latitude: ANKARA.latitude + 0.5 }],
        'driving',
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('asks again for a different mode', async () => {
      fetchMock.mockResolvedValue(envelope(SHAPES));
      const service = loadService();

      await service.fetchTerrain([ISTANBUL, ANKARA], 'driving');
      await service.fetchTerrain([ISTANBUL, ANKARA], 'walking');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchModeDurations', () => {
    it('asks for every mode in one request', async () => {
      fetchMock.mockResolvedValue(envelope({ driving: 1800, walking: 7200 }));

      const durations = await loadService().fetchModeDurations(
        { origin: ISTANBUL, destination: ANKARA },
        ['driving', 'walking'],
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(requestedUrl().pathname).toBe('/api/maps/durations');
      expect(requestBody().modes).toEqual(['driving', 'walking']);
      expect(durations).toEqual({ driving: 1800, walking: 7200 });
    });

    it('asks once for the same journey and modes', async () => {
      fetchMock.mockResolvedValue(envelope({ driving: 1800 }));
      const service = loadService();
      const journey = { origin: ISTANBUL, destination: ANKARA };

      await service.fetchModeDurations(journey, ['driving']);
      await service.fetchModeDurations({ ...journey }, ['driving']);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('asks again when the modes asked for change', async () => {
      fetchMock.mockResolvedValue(envelope({ driving: 1800 }));
      const service = loadService();
      const journey = { origin: ISTANBUL, destination: ANKARA };

      await service.fetchModeDurations(journey, ['driving']);
      await service.fetchModeDurations(journey, ['driving', 'transit']);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('reverseGeocode', () => {
    it('sends the coordinates as query parameters', async () => {
      fetchMock.mockResolvedValue(envelope({ address: 'Kadıköy' }));

      await loadService().reverseGeocode(ISTANBUL);

      const url = requestedUrl();
      expect(url.pathname).toBe('/api/maps/geocode/reverse');
      expect(url.searchParams.get('latitude')).toBe('41.0082');
      expect(url.searchParams.get('longitude')).toBe('28.9784');
    });

    it('asks once for a pin dropped twice in the same place', async () => {
      fetchMock.mockResolvedValue(envelope({ address: 'Kadıköy' }));
      const service = loadService();

      await service.reverseGeocode(ISTANBUL);
      await service.reverseGeocode({ ...ISTANBUL });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('places', () => {
    it('searches with the query and session token', async () => {
      fetchMock.mockResolvedValue(
        envelope([{ placeId: 'a', description: 'Kadıköy' }]),
      );

      const predictions = await loadService().fetchPlacePredictions(
        'kadikoy',
        'session-1',
      );

      const url = requestedUrl();
      expect(url.pathname).toBe('/api/maps/places/search');
      expect(url.searchParams.get('input')).toBe('kadikoy');
      expect(url.searchParams.get('sessionToken')).toBe('session-1');
      expect(predictions).toEqual([{ placeId: 'a', description: 'Kadıköy' }]);
    });

    it('returns nothing rather than throwing when a search is aborted', async () => {
      const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
      fetchMock.mockRejectedValue(abort);

      await expect(
        loadService().fetchPlacePredictions('kadikoy', 'session-1'),
      ).resolves.toEqual([]);
    });

    it('escapes a place id on its way into the path', async () => {
      fetchMock.mockResolvedValue(envelope(null));

      await loadService().fetchPlaceDetails('place/one', 'session-1');

      expect(requestedUrl().pathname).toBe('/api/maps/places/place%2Fone');
    });

    it('returns null rather than throwing when a lookup is aborted', async () => {
      const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
      fetchMock.mockRejectedValue(abort);

      await expect(
        loadService().fetchPlaceDetails('place-1', 'session-1'),
      ).resolves.toBeNull();
    });
  });

  describe('session tokens', () => {
    it('mints a different token each time', () => {
      const service = loadService();

      expect(service.createSessionToken()).not.toBe(
        service.createSessionToken(),
      );
    });
  });

  describe('searching along a route', () => {
    const RESULT = {
      places: [
        {
          placeId: 'a',
          name: 'Çiya Sofrası',
          address: 'Caferağa',
          latitude: 40.99,
          longitude: 29.02,
          types: ['restaurant'],
          distanceFromRouteMeters: 320,
          distanceAlongRouteMeters: 12_000,
          detourMeters: 640,
          insertAfterIndex: 0,
        },
      ],
      radiusMeters: 2000,
      routeDistanceMeters: 45_000,
      routeDurationSeconds: 1800,
      mode: 'driving',
      searchedPoints: 7,
      coversWholeRoute: true,
    };

    const search = {
      origin: ISTANBUL,
      destination: ANKARA,
      category: 'restaurant',
      radiusMeters: 2000,
    };

    it('posts the journey and what to look for along it', async () => {
      fetchMock.mockResolvedValue(envelope(RESULT));

      const result = await loadService().searchPlacesAlongRoute(search);

      expect(requestedUrl().pathname).toBe('/api/maps/places/along-route');
      expect(requestInit().method).toBe('POST');
      expect(requestBody()).toEqual(search);
      expect(result).toEqual(RESULT);
    });

    it('asks once for the same search repeated', async () => {
      fetchMock.mockResolvedValue(envelope(RESULT));
      const service = loadService();

      await service.searchPlacesAlongRoute(search);
      await service.searchPlacesAlongRoute(search);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('asks again when the corridor widens', async () => {
      fetchMock.mockResolvedValue(envelope(RESULT));
      const service = loadService();

      await service.searchPlacesAlongRoute(search);
      await service.searchPlacesAlongRoute({ ...search, radiusMeters: 5000 });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('asks again when the search itself changes', async () => {
      fetchMock.mockResolvedValue(envelope(RESULT));
      const service = loadService();

      await service.searchPlacesAlongRoute({ ...search, query: 'sushi' });
      await service.searchPlacesAlongRoute({ ...search, query: 'kebap' });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('shares one request between callers asking for the same search', async () => {
      fetchMock.mockResolvedValue(envelope(RESULT));
      const service = loadService();

      const [first, second] = await Promise.all([
        service.searchPlacesAlongRoute(search),
        service.searchPlacesAlongRoute(search),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(first).toEqual(second);
    });

    it('lets a real failure through, so the screen can say so', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 503 });

      await expect(
        loadService().searchPlacesAlongRoute(search),
      ).rejects.toThrow();
    });
  });
});
