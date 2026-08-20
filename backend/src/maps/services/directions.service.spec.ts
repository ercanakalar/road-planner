import { DirectionsService, toRouteRequest } from './directions.service';
import { GoogleMapsClient } from './google-maps.client';
import { LatLng } from '../types/maps.types';

const ISTANBUL: LatLng = { latitude: 41.0082, longitude: 28.9784 };
const ANKARA: LatLng = { latitude: 39.9334, longitude: 32.8597 };
const BOLU: LatLng = { latitude: 40.7392, longitude: 31.6089 };

const directionsBody = (
  legs: { duration: number; distance: number }[],
  points = '_p~iF~ps|U',
) => ({
  status: 'OK',
  routes: [
    {
      legs: legs.map((leg) => ({
        duration: { value: leg.duration },
        distance: { value: leg.distance },
      })),
      overview_polyline: { points },
    },
  ],
});

describe('DirectionsService', () => {
  let client: { get: jest.Mock };
  let service: DirectionsService;

  const paramsOf = (call = 0) => client.get.mock.calls[call][1];

  beforeEach(() => {
    client = { get: jest.fn() };
    service = new DirectionsService(client as unknown as GoogleMapsClient);
  });

  describe('route', () => {
    it('asks Google for the mode requested, between the given points', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await service.route({
        origin: ISTANBUL,
        destination: ANKARA,
        mode: 'walking',
      });

      expect(client.get).toHaveBeenCalledWith(
        '/directions/json',
        expect.objectContaining({
          origin: '41.008200,28.978400',
          destination: '39.933400,32.859700',
          mode: 'walking',
        }),
      );
    });

    it('drives by default', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await service.route({ origin: ISTANBUL, destination: ANKARA });

      expect(paramsOf().mode).toBe('driving');
    });

    it('passes intermediate stops in the order they were given', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await service.route({
        origin: ISTANBUL,
        destination: ANKARA,
        waypoints: [BOLU, BOLU],
      });

      expect(paramsOf().waypoints).toBe(
        '40.739200,31.608900|40.739200,31.608900',
      );
    });

    it('sends no waypoints parameter for a two-point route', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await service.route({ origin: ISTANBUL, destination: ANKARA });

      expect(paramsOf()).not.toHaveProperty('waypoints');
    });

    it('asks Google to reorder the stops only when told to', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await service.route({
        origin: ISTANBUL,
        destination: ANKARA,
        waypoints: [BOLU],
        optimize: true,
      });

      expect(paramsOf().waypoints).toBe('optimize:true|40.739200,31.608900');
    });

    it('totals duration and distance across every leg', async () => {
      client.get.mockResolvedValue(
        directionsBody([
          { duration: 3600, distance: 100_000 },
          { duration: 1800, distance: 50_000 },
        ]),
      );

      await expect(
        service.route({
          origin: ISTANBUL,
          destination: ANKARA,
          waypoints: [BOLU],
        }),
      ).resolves.toMatchObject({
        durationSeconds: 5400,
        distanceMeters: 150_000,
      });
    });

    it('hands back decoded coordinates rather than an encoded polyline', async () => {
      client.get.mockResolvedValue(directionsBody([], '_p~iF~ps|U'));

      const route = await service.route({
        origin: ISTANBUL,
        destination: ANKARA,
      });

      expect(route?.coordinates).toEqual([
        { latitude: 38.5, longitude: -120.2 },
      ]);
    });

    it('reports the mode the route was calculated for', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await expect(
        service.route({
          origin: ISTANBUL,
          destination: ANKARA,
          mode: 'transit',
        }),
      ).resolves.toMatchObject({ mode: 'transit' });
    });

    it('returns null when Google knows of no route', async () => {
      client.get.mockResolvedValue({ status: 'ZERO_RESULTS' });

      await expect(
        service.route({ origin: ISTANBUL, destination: ANKARA }),
      ).resolves.toBeNull();
    });

    it('returns null when the response carries no route', async () => {
      client.get.mockResolvedValue({ status: 'OK', routes: [] });

      await expect(
        service.route({ origin: ISTANBUL, destination: ANKARA }),
      ).resolves.toBeNull();
    });

    it('survives a route with no legs or polyline', async () => {
      client.get.mockResolvedValue({ status: 'OK', routes: [{}] });

      await expect(
        service.route({ origin: ISTANBUL, destination: ANKARA }),
      ).resolves.toMatchObject({
        coordinates: [],
        durationSeconds: 0,
        distanceMeters: 0,
      });
    });

    it('lets a client failure through rather than reporting no route', async () => {
      client.get.mockRejectedValue(new Error('Map service is unavailable'));

      await expect(
        service.route({ origin: ISTANBUL, destination: ANKARA }),
      ).rejects.toThrow('Map service is unavailable');
    });
  });

  describe('caching', () => {
    it('asks Google once for the same journey', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      const request = { origin: ISTANBUL, destination: ANKARA };
      await service.route(request);
      await service.route({ ...request });

      expect(client.get).toHaveBeenCalledTimes(1);
    });

    it('treats a different mode as a different journey', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await service.route({
        origin: ISTANBUL,
        destination: ANKARA,
        mode: 'driving',
      });
      await service.route({
        origin: ISTANBUL,
        destination: ANKARA,
        mode: 'walking',
      });

      expect(client.get).toHaveBeenCalledTimes(2);
    });

    it('treats an added stop as a different journey', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await service.route({ origin: ISTANBUL, destination: ANKARA });
      await service.route({
        origin: ISTANBUL,
        destination: ANKARA,
        waypoints: [BOLU],
      });

      expect(client.get).toHaveBeenCalledTimes(2);
    });

    it('ignores movement below the precision a pin drop carries', async () => {
      client.get.mockResolvedValue(directionsBody([]));

      await service.route({ origin: ISTANBUL, destination: ANKARA });
      await service.route({
        origin: { ...ISTANBUL, latitude: ISTANBUL.latitude + 1e-9 },
        destination: ANKARA,
      });

      expect(client.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('durations', () => {
    it('reports a travel time per mode', async () => {
      client.get.mockImplementation((_path, params) =>
        Promise.resolve(
          directionsBody([
            { duration: params.mode === 'walking' ? 7200 : 1800, distance: 1 },
          ]),
        ),
      );

      await expect(
        service.durations({ origin: ISTANBUL, destination: ANKARA }, [
          'driving',
          'walking',
        ]),
      ).resolves.toEqual({ driving: 1800, walking: 7200 });
    });

    it('leaves out a mode with no route rather than reporting zero', async () => {
      client.get.mockImplementation((_path, params) =>
        params.mode === 'transit'
          ? Promise.resolve({ status: 'ZERO_RESULTS' })
          : Promise.resolve(directionsBody([{ duration: 1800, distance: 1 }])),
      );

      await expect(
        service.durations({ origin: ISTANBUL, destination: ANKARA }, [
          'driving',
          'transit',
        ]),
      ).resolves.toEqual({ driving: 1800 });
    });

    it('still reports the modes that answered when one call fails', async () => {
      client.get.mockImplementation((_path, params) =>
        params.mode === 'transit'
          ? Promise.reject(new Error('upstream'))
          : Promise.resolve(directionsBody([{ duration: 1800, distance: 1 }])),
      );

      await expect(
        service.durations({ origin: ISTANBUL, destination: ANKARA }, [
          'driving',
          'transit',
        ]),
      ).resolves.toEqual({ driving: 1800 });
    });

    it('reuses a route already fetched for one of the modes', async () => {
      client.get.mockResolvedValue(
        directionsBody([{ duration: 60, distance: 1 }]),
      );

      await service.route({
        origin: ISTANBUL,
        destination: ANKARA,
        mode: 'driving',
      });
      await service.durations({ origin: ISTANBUL, destination: ANKARA }, [
        'driving',
        'walking',
      ]);

      expect(client.get).toHaveBeenCalledTimes(2);
    });
  });
});

describe('toRouteRequest', () => {
  it('splits an ordered list into origin, stops and destination', () => {
    expect(toRouteRequest([ISTANBUL, BOLU, ANKARA], 'driving')).toEqual({
      origin: ISTANBUL,
      destination: ANKARA,
      waypoints: [BOLU],
      mode: 'driving',
    });
  });

  it('leaves the mode out when none was asked for', () => {
    expect(toRouteRequest([ISTANBUL, ANKARA])).not.toHaveProperty('mode');
  });

  it('has no stops between two points', () => {
    expect(toRouteRequest([ISTANBUL, ANKARA])).toMatchObject({ waypoints: [] });
  });

  it.each([[[]], [[ISTANBUL]]])(
    'refuses to build a route from %j',
    (points) => {
      expect(toRouteRequest(points)).toBeNull();
    },
  );
});
