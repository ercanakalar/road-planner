import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { createExecutionContext, createPrismaMock } from 'src/testing/mocks';
import { RoadOwnerGuard } from './road-owner.guard';

const OWNER = 'user-1';
const ATTACKER = 'user-2';
const ROAD_ID = 'road-1';
const ATTACKER_ROAD_ID = 'road-2';
const WAYPOINT_ID = 'wp-1';

describe('RoadOwnerGuard', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let guard: RoadOwnerGuard;

  beforeEach(() => {
    prisma = createPrismaMock();
    guard = new RoadOwnerGuard(prisma as any);
  });

  const givenRoads = (roads: Record<string, string | null>) => {
    prisma.road.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where.id in roads ? { userId: roads[where.id] } : null),
    );
  };

  const givenWaypoint = (id: string, roadId: string | null) => {
    prisma.wayPoint.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where.id === id ? { roadId } : null),
    );
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('road routes (:id)', () => {
    it('allows the owner', async () => {
      givenRoads({ [ROAD_ID]: OWNER });
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { id: ROAD_ID },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('denies a non-owner', async () => {
      givenRoads({ [ROAD_ID]: OWNER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { id: ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('denies an ownerless road', async () => {
      givenRoads({ [ROAD_ID]: null });
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { id: ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('reports a missing road as not found', async () => {
      givenRoads({});
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { id: 'missing' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorder route (:roadId)', () => {
    it('allows the owner', async () => {
      givenRoads({ [ROAD_ID]: OWNER });
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { roadId: ROAD_ID },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('denies a non-owner', async () => {
      givenRoads({ [ROAD_ID]: OWNER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { roadId: ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('waypoint routes (:waypointId)', () => {
    it('allows the owner of the waypoint’s road', async () => {
      givenWaypoint(WAYPOINT_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER });
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { waypointId: WAYPOINT_ID },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('resolves the road through the waypoint', async () => {
      givenWaypoint(WAYPOINT_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER });
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { waypointId: WAYPOINT_ID },
      });

      await guard.canActivate(context);

      expect(prisma.wayPoint.findUnique).toHaveBeenCalledWith({
        where: { id: WAYPOINT_ID },
        select: { roadId: true },
      });
      expect(prisma.road.findUnique).toHaveBeenCalledWith({
        where: { id: ROAD_ID },
        select: { userId: true },
      });
    });

    it('denies the owner of a different road', async () => {
      givenWaypoint(WAYPOINT_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { waypointId: WAYPOINT_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('reports a missing waypoint as not found', async () => {
      givenWaypoint('other', ROAD_ID);
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { waypointId: WAYPOINT_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('denies a waypoint attached to no road', async () => {
      givenWaypoint(WAYPOINT_ID, null);
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { waypointId: WAYPOINT_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('IDOR via the query string (C3)', () => {
    it('ignores ?id= on a waypoint route and authorizes the waypoint’s own road', async () => {
      givenWaypoint(WAYPOINT_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { waypointId: WAYPOINT_ID },
        query: { id: ATTACKER_ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('never reads the road named in the query string', async () => {
      givenWaypoint(WAYPOINT_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { waypointId: WAYPOINT_ID },
        query: { id: ATTACKER_ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow();
      expect(prisma.road.findUnique).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: ATTACKER_ROAD_ID } }),
      );
    });

    it('ignores ?id= on a road route too', async () => {
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { id: ROAD_ID },
        query: { id: ATTACKER_ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('does not authorize a request carrying only ?id=', async () => {
      givenRoads({ [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        query: { id: ATTACKER_ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.road.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('failure modes', () => {
    it('rejects an unauthenticated request as 401, not 500', async () => {
      const { context } = createExecutionContext({ params: { id: ROAD_ID } });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.road.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a principal with no userId', async () => {
      const { context } = createExecutionContext({
        user: {},
        params: { id: ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('fails closed on a route with no recognised parameter', async () => {
      const { context } = createExecutionContext({ user: { userId: OWNER } });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('prefers waypointId when both parameters are present', async () => {
      givenWaypoint(WAYPOINT_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { waypointId: WAYPOINT_ID, id: ATTACKER_ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
