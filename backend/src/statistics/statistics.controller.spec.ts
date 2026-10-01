import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ok } from 'src/common/http/api-response';
import { PERMISSION_METADATA_KEY } from 'src/common/decorators/require-permission.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions/permissions.guard';
import { IS_PUBLIC_METADATA_KEY } from 'src/common/decorators/public.decorator';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { UsageRecorder } from './usage.recorder';
import { ViewerResolver } from './viewer.resolver';

const CALLER_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('StatisticsController', () => {
  describe('access rules', () => {
    const reflector = new Reflector();
    const handler = (name: keyof StatisticsController) =>
      StatisticsController.prototype[name];

    it('keeps the app-wide overview behind the dashboard permission', () => {
      expect(Reflect.getMetadata('__guards__', handler('overview'))).toContain(
        PermissionsGuard,
      );
      expect(reflector.get(PERMISSION_METADATA_KEY, handler('overview'))).toBe(
        'ACCESS_DASHBOARD',
      );
    });

    it('requires a signed-in person for their own statistics', () => {
      expect(
        reflector.get(IS_PUBLIC_METADATA_KEY, handler('mine')),
      ).toBeFalsy();
    });

    it('lets a signed-out phone report its on-device events', () => {
      expect(reflector.get(IS_PUBLIC_METADATA_KEY, handler('report'))).toBe(
        true,
      );
    });
  });

  describe('routing', () => {
    let app: INestApplication;
    let statistics: { mine: jest.Mock; overview: jest.Mock };
    let recorder: { recordMany: jest.Mock };
    let viewers: { userIdOf: jest.Mock };

    beforeEach(async () => {
      statistics = {
        mine: jest.fn().mockResolvedValue(ok()),
        overview: jest.fn().mockResolvedValue(ok()),
      };
      recorder = { recordMany: jest.fn().mockResolvedValue(1) };
      viewers = { userIdOf: jest.fn().mockResolvedValue(CALLER_ID) };

      const module = await Test.createTestingModule({
        controllers: [StatisticsController],
        providers: [
          { provide: StatisticsService, useValue: statistics },
          { provide: UsageRecorder, useValue: recorder },
          { provide: ViewerResolver, useValue: viewers },
        ],
      })
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => true })
        .compile();

      app = module.createNestApplication();
      app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
        req.user = { userId: CALLER_ID };
        next();
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('answers /statistics/me for the caller', async () => {
      await request(app.getHttpServer()).get('/statistics/me').expect(200);

      expect(statistics.mine).toHaveBeenCalledWith(CALLER_ID);
    });

    it('records a reported batch for whoever sent it', async () => {
      const events = [{ name: 'app_opened', detail: 'android' }];

      const response = await request(app.getHttpServer())
        .post('/statistics/events')
        .send({ events })
        .expect(200);

      expect(recorder.recordMany).toHaveBeenCalledWith(events, CALLER_ID);
      expect(response.body).toMatchObject({ data: { recorded: 1 } });
    });
  });
});
