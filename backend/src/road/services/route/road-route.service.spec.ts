import { NotFoundException } from '@nestjs/common';

import { DirectionsService } from 'src/maps/services/directions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { RoadVisibility } from '../visibility/road-visibility';
import { RoadRouteService } from './road-route.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const USER_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784 };
const BOLU = { latitude: 40.7392, longitude: 31.6089 };
const ANKARA = { latitude: 39.9334, longitude: 32.8597 };

const ROUTE = {
  mode: 'driving' as const,
  coordinates: [ISTANBUL, ANKARA],
  durationSeconds: 1800,
  distanceMeters: 45_000,
};

describe('RoadRouteService', () => {
  let prisma: PrismaMock;
  let directions: { route: jest.Mock; durations: jest.Mock };
  let service: RoadRouteService;

  const givenRoad = (stops: { latitude: number; longitude: number }[]) =>
    prisma.road.findFirst.mockResolvedValue({ stops });

  beforeEach(() => {
    prisma = createPrismaMock();
    directions = { route: jest.fn(), durations: jest.fn() };

    service = new RoadRouteService(
      prisma as unknown as PrismaService,
      new RoadVisibility(),
      directions as unknown as DirectionsService,
    );
  });

  describe('getRoute', () => {
    it('routes from the first stop to the last, through the rest', async () => {
      givenRoad([ISTANBUL, BOLU, ANKARA]);
      directions.route.mockResolvedValue(ROUTE);

      await service.getRoute(ROAD_ID, USER_ID);

      expect(directions.route).toHaveBeenCalledWith({
        origin: ISTANBUL,
        destination: ANKARA,
        waypoints: [BOLU],
      });
    });

    it('passes the requested mode on', async () => {
      givenRoad([ISTANBUL, ANKARA]);
      directions.route.mockResolvedValue(ROUTE);

      await service.getRoute(ROAD_ID, USER_ID, 'transit');

      expect(directions.route).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'transit' }),
      );
    });

    it('reads the stops in stored order', async () => {
      givenRoad([ISTANBUL, ANKARA]);
      directions.route.mockResolvedValue(ROUTE);

      await service.getRoute(ROAD_ID, USER_ID);

      expect(prisma.road.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            stops: expect.objectContaining({ orderBy: { order: 'asc' } }),
          },
        }),
      );
    });

    it('answers with the route', async () => {
      givenRoad([ISTANBUL, ANKARA]);
      directions.route.mockResolvedValue(ROUTE);

      await expect(service.getRoute(ROAD_ID, USER_ID)).resolves.toMatchObject({
        status: 'success',
        data: ROUTE,
      });
    });

    it('says so when Google has no route for the road', async () => {
      givenRoad([ISTANBUL, ANKARA]);
      directions.route.mockResolvedValue(null);

      await expect(service.getRoute(ROAD_ID, USER_ID)).resolves.toMatchObject({
        data: null,
        message: 'No route between those points',
      });
    });

    it.each([[[]], [[ISTANBUL]]])(
      'spends nothing routing a road with %j for stops',
      async (stops) => {
        givenRoad(stops);

        await expect(service.getRoute(ROAD_ID, USER_ID)).resolves.toMatchObject(
          { data: null, message: 'A route needs at least two stops' },
        );
        expect(directions.route).not.toHaveBeenCalled();
      },
    );

    it('refuses a road the caller may not read', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.getRoute(ROAD_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(directions.route).not.toHaveBeenCalled();
    });

    it('looks a road up under the reader visibility rules', async () => {
      givenRoad([ISTANBUL, ANKARA]);
      directions.route.mockResolvedValue(ROUTE);

      await service.getRoute(ROAD_ID, null);

      expect(prisma.road.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ROAD_ID, isPublic: true, archivedAt: null },
        }),
      );
    });
  });

  describe('getDurations', () => {
    it('asks for the modes it was given', async () => {
      givenRoad([ISTANBUL, ANKARA]);
      directions.durations.mockResolvedValue({ driving: 1800 });

      await service.getDurations(ROAD_ID, USER_ID, ['driving', 'walking']);

      expect(directions.durations).toHaveBeenCalledWith(
        { origin: ISTANBUL, destination: ANKARA, waypoints: [] },
        ['driving', 'walking'],
      );
    });

    it('answers with a time per mode', async () => {
      givenRoad([ISTANBUL, ANKARA]);
      directions.durations.mockResolvedValue({ driving: 1800, walking: 7200 });

      await expect(
        service.getDurations(ROAD_ID, USER_ID, ['driving', 'walking']),
      ).resolves.toMatchObject({ data: { driving: 1800, walking: 7200 } });
    });

    it('answers with nothing for a road too short to route', async () => {
      givenRoad([ISTANBUL]);

      await expect(
        service.getDurations(ROAD_ID, USER_ID, ['driving']),
      ).resolves.toMatchObject({
        data: {},
        message: 'A route needs at least two stops',
      });
      expect(directions.durations).not.toHaveBeenCalled();
    });

    it('refuses a road the caller may not read', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(
        service.getDurations(ROAD_ID, USER_ID, ['driving']),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
