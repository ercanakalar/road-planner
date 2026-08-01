import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { createConfigMock } from 'src/testing/mocks';
import { HelperService } from './helper.service';

const ROAD_SHARE_KEY = 'road-share-secret-at-least-32-chars!!';

describe('RoadHelperService', () => {
  let service: HelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelperService,
        JwtService,
        {
          provide: ConfigService,
          useValue: createConfigMock({
            ROAD_SHARE_KEY,
            ROAD_SHARE_EXPIRE_IN: '7d',
          }),
        },
      ],
    }).compile();

    service = module.get(HelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('round-trips a road id through a share token', async () => {
    const token = await service.generateTokenForShareRoad('road-1');

    await expect(service.decodeTokenForShareRoad(token)).resolves.toMatchObject(
      { id: 'road-1' },
    );
  });

  it('issues share tokens with a finite lifetime', async () => {
    const token = await service.generateTokenForShareRoad('road-1');

    const payload = await service.decodeTokenForShareRoad(token);

    expect(payload.exp).toBeDefined();
  });

  it('rejects a token signed with a different secret', async () => {
    const foreign = new JwtService().sign(
      { id: 'road-1' },
      { secret: 'a-different-secret-of-sufficient-length' },
    );

    await expect(service.decodeTokenForShareRoad(foreign)).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const token = await service.generateTokenForShareRoad('road-1');

    await expect(
      service.decodeTokenForShareRoad(`${token}x`),
    ).rejects.toThrow();
  });
});
