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
const STOP_ID = 'wp-1';

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

  const givenStop = (id: string, roadId: string | null) => {
    prisma.stop.findUnique.mockImplementation(({ where }: any) =>
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

  describe('stop routes (:stopId)', () => {
    it('allows the owner of the stop’s road', async () => {
      givenStop(STOP_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER });
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { stopId: STOP_ID },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('resolves the road through the stop', async () => {
      givenStop(STOP_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER });
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { stopId: STOP_ID },
      });

      await guard.canActivate(context);

      expect(prisma.stop.findUnique).toHaveBeenCalledWith({
        where: { id: STOP_ID },
        select: { roadId: true },
      });
      expect(prisma.road.findUnique).toHaveBeenCalledWith({
        where: { id: ROAD_ID },
        select: { userId: true },
      });
    });

    it('denies the owner of a different road', async () => {
      givenStop(STOP_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { stopId: STOP_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('reports a missing stop as not found', async () => {
      givenStop('other', ROAD_ID);
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { stopId: STOP_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('denies a stop attached to no road', async () => {
      givenStop(STOP_ID, null);
      const { context } = createExecutionContext({
        user: { userId: OWNER },
        params: { stopId: STOP_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('IDOR via the query string (C3)', () => {
    it('ignores ?id= on a stop route and authorizes the stop’s own road', async () => {
      givenStop(STOP_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { stopId: STOP_ID },
        query: { id: ATTACKER_ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('never reads the road named in the query string', async () => {
      givenStop(STOP_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { stopId: STOP_ID },
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

    it('prefers stopId when both parameters are present', async () => {
      givenStop(STOP_ID, ROAD_ID);
      givenRoads({ [ROAD_ID]: OWNER, [ATTACKER_ROAD_ID]: ATTACKER });
      const { context } = createExecutionContext({
        user: { userId: ATTACKER },
        params: { stopId: STOP_ID, id: ATTACKER_ROAD_ID },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
