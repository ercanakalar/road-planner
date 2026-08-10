import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { HelperService } from 'src/road/services/helper/helper.service';
import {
  createConfigMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import { RoadSharingService } from './road-sharing.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';

describe('RoadSharingService', () => {
  let service: RoadSharingService;
  let prisma: PrismaMock;

  const helperMock = () => ({
    generateTokenForShareRoad: jest.fn().mockResolvedValue('share-token'),
    decodeTokenForShareRoad: jest.fn().mockResolvedValue({ id: ROAD_ID }),
  });

  const buildService = async (config: Record<string, unknown>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadSharingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: createConfigMock(config) },
        { provide: HelperService, useValue: helperMock() },
      ],
    }).compile();

    return module.get(RoadSharingService);
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    service = await buildService({ FRONTEND_URL: 'http://localhost:8081' });
  });

  describe('createLink', () => {
    it('builds the link from the share base when one is configured', async () => {
      const configured = await buildService({
        FRONTEND_URL: 'http://localhost:8081',
        SHARE_LINK_BASE_URL: 'https://roads.example.com/',
      });

      const result = await configured.createLink(ROAD_ID);

      expect(result.data.url).toBe(
        'https://roads.example.com/share/share-token',
      );
    });

    it('falls back to the web client when no share base is set', async () => {
      const result = await service.createLink(ROAD_ID);

      expect(result.data.url).toBe('http://localhost:8081/share/share-token');
    });

    it('returns the token on its own, for a link the app builds itself', async () => {
      const result = await service.createLink(ROAD_ID);

      expect(result.data.token).toBe('share-token');
    });
  });

  describe('resolveLink', () => {
    const sharedRoad = {
      id: ROAD_ID,
      title: 'Coast run',
      archivedAt: null,
      user: { nickName: 'ada', firstName: 'Ada' },
      wayPoints: [],
    };

    it('resolves the road the token names', async () => {
      prisma.road.findUnique.mockResolvedValue(sharedRoad);

      const result = await service.resolveLink('share-token');

      expect(result.data.id).toBe(ROAD_ID);
      expect(result.data.author).toBe('ada');
    });

    it('refuses a road its owner has deleted', async () => {
      prisma.road.findUnique.mockResolvedValue({
        ...sharedRoad,
        archivedAt: new Date(),
      });

      await expect(service.resolveLink('share-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses a token naming a road that is gone', async () => {
      prisma.road.findUnique.mockResolvedValue(null);

      await expect(service.resolveLink('share-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("reports the reader's own favourite state when there is a reader", async () => {
      prisma.road.findUnique.mockResolvedValue({
        ...sharedRoad,
        favoriteRoads: [{ id: 'fav-1' }],
      });

      const result = await service.resolveLink('share-token', 'user-2');

      expect(result.data.isFavorite).toBe(true);
    });

    it('does not ask for favourites when nobody is signed in', async () => {
      prisma.road.findUnique.mockResolvedValue(sharedRoad);

      const result = await service.resolveLink('share-token');

      expect(
        prisma.road.findUnique.mock.calls[0][0].include.favoriteRoads,
      ).toBe(false);
      expect(result.data.isFavorite).toBe(false);
    });
  });
});
