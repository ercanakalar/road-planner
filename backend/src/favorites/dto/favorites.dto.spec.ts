import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import {
  ToggleFavoriteRoadDto,
  ToggleFavoriteWaypointDto,
} from './favorites.dto';

const UUID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';

describe('ToggleFavoriteWaypointDto', () => {
  it('accepts a UUID', async () => {
    await expect(
      collectDtoErrors(ToggleFavoriteWaypointDto, { waypointId: UUID }),
    ).resolves.toEqual([]);
  });

  it.each(['not-a-uuid', '', '123', 12345, null])(
    'rejects %p',
    async (waypointId) => {
      await expect(
        collectDtoErrors(ToggleFavoriteWaypointDto, { waypointId }),
      ).resolves.not.toEqual([]);
    },
  );

  it('requires the field', async () => {
    await expect(
      collectDtoErrors(ToggleFavoriteWaypointDto, {}),
    ).resolves.not.toEqual([]);
  });

  it('strips undeclared properties', async () => {
    const result = await validateDto(ToggleFavoriteWaypointDto, {
      waypointId: UUID,
      userId: 'someone-else',
    });

    expect(result).toEqual({ waypointId: UUID });
  });
});

describe('ToggleFavoriteRoadDto', () => {
  it('accepts a UUID', async () => {
    await expect(
      collectDtoErrors(ToggleFavoriteRoadDto, { roadId: UUID }),
    ).resolves.toEqual([]);
  });

  it('rejects a non-UUID', async () => {
    await expect(
      collectDtoErrors(ToggleFavoriteRoadDto, { roadId: 'nope' }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a missing roadId before it reaches Prisma', async () => {
    await expect(
      collectDtoErrors(ToggleFavoriteRoadDto, {}),
    ).resolves.not.toEqual([]);
  });

  it('strips a userId supplied by the client', async () => {
    const result = await validateDto(ToggleFavoriteRoadDto, {
      roadId: UUID,
      userId: 'someone-else',
    });

    expect(result).not.toHaveProperty('userId');
  });
});
