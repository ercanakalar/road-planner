import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { OptionalAccessGuard } from 'src/common/guards/optional-access/optional-access.guard';
import { RoadOwnerGuard } from 'src/common/guards/road-owner/road-owner.guard';
import { ok } from 'src/common/http/api-response';
import { TRANSPORT_MODES } from 'src/maps/types/maps.types';
import { RoadController } from './road.controller';
import { RoadService } from './services/road/road.service';
import { RoadRouteService } from './services/route/road-route.service';
import { RoadSearchService } from './services/search/road-search.service';
import { RoadSharingService } from './services/sharing/road-sharing.service';
import { WaypointService } from './services/waypoint/waypoint.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const WAYPOINT_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';
const USER_ID = 'd3a1e1c4-3b5f-4e0c-9f4d-2c3d4e5f6071';

const allow = { canActivate: () => true };

describe('RoadController routing', () => {
  let app: INestApplication;
  let roadService: { getRoadById: jest.Mock };
  let waypointService: { getWaypointById: jest.Mock };
  let routeService: { getRoute: jest.Mock; getDurations: jest.Mock };
  let searchService: { searchRoads: jest.Mock };

  const get = (path: string) => request(app.getHttpServer()).get(path);

  beforeEach(async () => {
    roadService = { getRoadById: jest.fn().mockResolvedValue(ok()) };
    waypointService = { getWaypointById: jest.fn().mockResolvedValue(ok()) };
    routeService = {
      getRoute: jest.fn().mockResolvedValue(ok()),
      getDurations: jest.fn().mockResolvedValue(ok()),
    };
    searchService = { searchRoads: jest.fn().mockResolvedValue(ok()) };

    const module = await Test.createTestingModule({
      controllers: [RoadController],
      providers: [
        { provide: RoadService, useValue: roadService },
        { provide: WaypointService, useValue: waypointService },
        { provide: RoadSharingService, useValue: {} },
        { provide: RoadRouteService, useValue: routeService },
        { provide: RoadSearchService, useValue: searchService },
      ],
    })
      .overrideGuard(OptionalAccessGuard)
      .useValue(allow)
      .overrideGuard(RoadOwnerGuard)
      .useValue(allow)
      .compile();

    app = module.createNestApplication();
    app.use((request: { user?: unknown }, _res: unknown, next: () => void) => {
      request.user = { userId: USER_ID };
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('reaches search, not the road lookup, at /road/search', async () => {
    // '/search' is a literal that '/:id' would happily swallow, and the UUID
    // pipe on that route would turn the mistake into a 400 rather than
    // anything that points at the cause.
    await get('/road/search?q=coast').expect(200);

    expect(roadService.getRoadById).not.toHaveBeenCalled();
    expect(searchService.searchRoads).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'coast' }),
      USER_ID,
    );
  });

  it('reaches the road itself at /road/:id', async () => {
    await get(`/road/${ROAD_ID}`).expect(200);

    expect(roadService.getRoadById).toHaveBeenCalledWith(ROAD_ID, USER_ID);
  });

  it('reaches the waypoint endpoint, not the road one, at /road/waypoint/:id', async () => {
    await get(`/road/waypoint/${WAYPOINT_ID}`).expect(200);

    expect(waypointService.getWaypointById).toHaveBeenCalled();
    expect(roadService.getRoadById).not.toHaveBeenCalled();
  });

  it('reaches the route endpoint at /road/:id/route', async () => {
    await get(`/road/${ROAD_ID}/route`).expect(200);

    expect(routeService.getRoute).toHaveBeenCalledWith(
      ROAD_ID,
      USER_ID,
      undefined,
    );
    expect(roadService.getRoadById).not.toHaveBeenCalled();
  });

  it('passes the requested transport mode to the route endpoint', async () => {
    await get(`/road/${ROAD_ID}/route?mode=transit`).expect(200);

    expect(routeService.getRoute).toHaveBeenCalledWith(
      ROAD_ID,
      USER_ID,
      'transit',
    );
  });

  it('reaches the durations endpoint at /road/:id/durations', async () => {
    await get(`/road/${ROAD_ID}/durations`).expect(200);

    expect(routeService.getDurations).toHaveBeenCalledWith(
      ROAD_ID,
      USER_ID,
      TRANSPORT_MODES,
    );
  });

  it('rejects a road id that is not a uuid', async () => {
    await get('/road/not-a-uuid/route').expect(400);

    expect(routeService.getRoute).not.toHaveBeenCalled();
  });
});
