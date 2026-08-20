import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/bootstrap';
import { GoogleMapsClient } from '../src/maps/services/google-maps.client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../src/testing/mocks';

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784 };
const ANKARA = { latitude: 39.9334, longitude: 32.8597 };
const BOLU = { latitude: 40.7392, longitude: 31.6089 };

const ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

const directionsBody = {
  status: 'OK',
  routes: [
    {
      legs: [{ duration: { value: 1800 }, distance: { value: 45_000 } }],
      overview_polyline: { points: '_p~iF~ps|U' },
    },
  ],
};

describe('Maps endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let client: { get: jest.Mock; isConfigured: jest.Mock };

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    prisma = createPrismaMock();
    client = { get: jest.fn(), isConfigured: jest.fn(() => true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(GoogleMapsClient)
      .useValue(client)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, { corsOrigins: '*' });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('without a token', () => {
    it('routes a journey', async () => {
      client.get.mockResolvedValue(directionsBody);

      const response = await api()
        .post('/api/maps/directions')
        .send({ origin: ISTANBUL, destination: ANKARA })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          coordinates: [{ latitude: 38.5, longitude: -120.2 }],
          durationSeconds: 1800,
          distanceMeters: 45_000,
        },
      });
    });

    it('names a point', async () => {
      client.get.mockResolvedValue({
        status: 'OK',
        results: [
          {
            formatted_address: 'Kadıköy, İstanbul',
            address_components: [{ long_name: 'Türkiye', types: ['country'] }],
          },
        ],
      });

      const response = await api()
        .get('/api/maps/geocode/reverse')
        .query({ latitude: '40.9903', longitude: '29.0275' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        address: 'Kadıköy, İstanbul',
        country: 'Türkiye',
      });
    });

    it('searches for a place', async () => {
      client.get.mockResolvedValue({
        status: 'OK',
        predictions: [{ place_id: 'abc', description: 'Kadıköy' }],
      });

      const response = await api()
        .get('/api/maps/places/search')
        .query({ input: 'kadikoy', sessionToken: 'e2e' })
        .expect(200);

      expect(response.body.data).toEqual([
        { placeId: 'abc', description: 'Kadıköy' },
      ]);
    });
  });

  describe('validation happens before anything is spent', () => {
    it.each([
      ['a missing origin', { destination: ANKARA }],
      [
        'an impossible latitude',
        { origin: { latitude: 999, longitude: 1 }, destination: ANKARA },
      ],
      [
        'an unknown transport mode',
        { origin: ISTANBUL, destination: ANKARA, mode: 'teleport' },
      ],
    ])('rejects %s', async (_label, body) => {
      client.get.mockResolvedValue(directionsBody);

      await api().post('/api/maps/directions').send(body).expect(400);

      expect(client.get).not.toHaveBeenCalled();
    });

    it('rejects a search too short to be worth a request', async () => {
      await api()
        .get('/api/maps/places/search')
        .query({ input: 'k' })
        .expect(400);

      expect(client.get).not.toHaveBeenCalled();
    });

    it('never forwards a key the caller tried to supply', async () => {
      client.get.mockResolvedValue(directionsBody);

      await api()
        .post('/api/maps/directions')
        .send({ origin: BOLU, destination: ANKARA, key: 'not-yours' })
        .expect(200);

      expect(client.get.mock.calls[0][1]).not.toHaveProperty('key');
    });
  });

  describe('a road as a route', () => {
    it('routes a road the caller can read', async () => {
      prisma.road.findFirst.mockResolvedValue({
        wayPoints: [ISTANBUL, ANKARA],
      });
      client.get.mockResolvedValue(directionsBody);

      const response = await api()
        .get(`/api/road/${ROAD_ID}/route`)
        .expect(200);

      expect(response.body.data).toMatchObject({ durationSeconds: 1800 });
    });

    it('reports a road the caller cannot read as missing', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await api().get(`/api/road/${ROAD_ID}/route`).expect(404);
    });

    it('spends nothing on a road with one waypoint', async () => {
      prisma.road.findFirst.mockResolvedValue({ wayPoints: [ISTANBUL] });

      const response = await api()
        .get(`/api/road/${ROAD_ID}/durations`)
        .expect(200);

      expect(response.body.data).toEqual({});
      expect(client.get).not.toHaveBeenCalled();
    });
  });
});
