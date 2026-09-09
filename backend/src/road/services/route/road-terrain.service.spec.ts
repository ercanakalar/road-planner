import { Test } from '@nestjs/testing';

import { DirectionsService } from 'src/maps/services/directions.service';
import { ElevationService } from 'src/maps/services/elevation.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoadVisibility } from '../visibility/road-visibility';
import { RoadTerrainService, StopTerrain } from './road-terrain.service';

const ROAD_ID = 'road-1';
const USER_ID = 'user-1';

/** A straight run north, `count` points a metre-ish apart in latitude. */
const northward = (count: number, stepMeters = 100) =>
  Array.from({ length: count }, (_, i) => ({
    latitude: 41 + (i * stepMeters) / 111_320,
    longitude: 29,
  }));

describe('RoadTerrainService', () => {
  let service: RoadTerrainService;
  let prisma: { road: { findFirst: jest.Mock } };
  let directions: { route: jest.Mock };
  let elevation: { elevations: jest.Mock };

  const givenStops = (count: number) =>
    prisma.road.findFirst.mockResolvedValue({
      stops: Array.from({ length: count }, (_, i) => ({
        id: `stop-${i + 1}`,
        latitude: 41 + i,
        longitude: 29,
      })),
    });

  beforeEach(async () => {
    prisma = { road: { findFirst: jest.fn() } };
    directions = { route: jest.fn() };
    elevation = { elevations: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RoadTerrainService,
        { provide: PrismaService, useValue: prisma },
        { provide: DirectionsService, useValue: directions },
        { provide: ElevationService, useValue: elevation },
        {
          provide: RoadVisibility,
          useValue: { road: jest.fn().mockReturnValue({ id: ROAD_ID }) },
        },
      ],
    }).compile();

    service = module.get(RoadTerrainService);
  });

  const terrainOf = async (): Promise<StopTerrain[]> =>
    (await service.getTerrain(ROAD_ID, USER_ID)).data;

  describe('measuring bare coordinates', () => {
    // A route being built on the map has no id to look up, so the same
    // reading has to work from the points alone.
    const northPair = northward(2, 1000);

    it('never touches the database', async () => {
      directions.route.mockResolvedValue(null);

      await service.measure(northPair);

      expect(prisma.road.findFirst).not.toHaveBeenCalled();
    });

    it('says nothing about a single point', async () => {
      expect(await service.measure(northward(1))).toEqual([null]);
      expect(directions.route).not.toHaveBeenCalled();
    });

    it('answers one entry per point, the first always empty', async () => {
      directions.route.mockResolvedValue({
        mode: 'driving',
        coordinates: northward(21),
        durationSeconds: 600,
        distanceMeters: 2000,
        legs: [{ durationSeconds: 600, distanceMeters: 2000 }],
      });
      elevation.elevations.mockImplementation((points: unknown[]) =>
        Promise.resolve(points.map((_, i) => 100 + i * 5)),
      );

      const shapes = await service.measure(northPair);

      expect(shapes).toHaveLength(2);
      expect(shapes[0]).toBeNull();
      expect(shapes[1]?.slopeGrade).toBe('gentle');
      // The road's length, not the straight line between the two points.
      expect(shapes[1]?.distanceFromPreviousMeters).toBe(2000);
    });

    it('gives up quietly when Google has no route', async () => {
      directions.route.mockResolvedValue(null);

      expect(await service.measure(northPair)).toEqual([null, null]);
      expect(elevation.elevations).not.toHaveBeenCalled();
    });
  });

  it('leaves a road the caller may not read undecorated, not broken', async () => {
    prisma.road.findFirst.mockResolvedValue(null);

    const terrain = await terrainOf();

    expect(terrain).toEqual([]);
    expect(directions.route).not.toHaveBeenCalled();
    expect(elevation.elevations).not.toHaveBeenCalled();
  });

  it('reads only the roads the caller may see', async () => {
    givenStops(1);

    await terrainOf();

    expect(prisma.road.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ROAD_ID } }),
    );
  });

  it('spends nothing on a road too short to route', async () => {
    givenStops(1);

    const terrain = await terrainOf();

    expect(terrain).toEqual([{ stopId: 'stop-1', shape: null }]);
    expect(directions.route).not.toHaveBeenCalled();
    expect(elevation.elevations).not.toHaveBeenCalled();
  });

  it('answers with bare stops when Google has no route', async () => {
    givenStops(2);
    directions.route.mockResolvedValue(null);

    const terrain = await terrainOf();

    expect(terrain.every((stop) => stop.shape === null)).toBe(true);
    expect(elevation.elevations).not.toHaveBeenCalled();
  });

  describe('with a route', () => {
    beforeEach(() => {
      givenStops(3);
      // 2km of road: 1km per leg, sampled every 100m.
      directions.route.mockResolvedValue({
        mode: 'driving',
        coordinates: northward(21),
        durationSeconds: 600,
        distanceMeters: 2000,
        legs: [
          { durationSeconds: 300, distanceMeters: 1000 },
          { durationSeconds: 300, distanceMeters: 1000 },
        ],
      });
      elevation.elevations.mockImplementation((points: unknown[]) =>
        Promise.resolve(points.map((_, i) => 100 + i * 5)),
      );
    });

    it('leaves the first stop with nothing arriving at it', async () => {
      const [first] = await terrainOf();

      expect(first).toEqual({ stopId: 'stop-1', shape: null });
    });

    it('gives every later stop the leg that reaches it', async () => {
      const terrain = await terrainOf();

      expect(terrain).toHaveLength(3);
      expect(terrain[1].shape).not.toBeNull();
      expect(terrain[2].shape).not.toBeNull();
      expect(terrain[1].stopId).toBe('stop-2');
    });

    it('measures the climb of each leg, not of the whole route', async () => {
      const terrain = await terrainOf();

      // The profile rises 5m per 100m sample across 20 samples: 100m in all,
      // half of it on each of the two legs.
      expect(terrain[1].shape?.climbMeters).toBeCloseTo(50, -1);
      expect(terrain[2].shape?.climbMeters).toBeCloseTo(50, -1);
      expect(terrain[1].shape?.slopePercent).toBeCloseTo(5, 0);
      expect(terrain[1].shape?.slopeGrade).toBe('gentle');
    });

    it('asks Google for elevation exactly once for the whole route', async () => {
      await terrainOf();

      expect(directions.route).toHaveBeenCalledTimes(1);
      expect(elevation.elevations).toHaveBeenCalledTimes(1);
    });

    it('never asks for more points than Google will answer at once', async () => {
      directions.route.mockResolvedValue({
        mode: 'driving',
        coordinates: northward(4000, 100), // 400km
        durationSeconds: 1,
        distanceMeters: 400_000,
        legs: [
          { durationSeconds: 1, distanceMeters: 200_000 },
          { durationSeconds: 1, distanceMeters: 200_000 },
        ],
      });

      await terrainOf();

      const asked = elevation.elevations.mock.calls[0][0] as unknown[];
      expect(asked.length).toBeLessThanOrEqual(512);
    });
  });
});
