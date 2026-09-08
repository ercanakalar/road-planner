import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import {
  ToggleFavoriteRoadDto,
  ToggleFavoriteStopDto,
} from './favorites.dto';

const UUID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';

describe('ToggleFavoriteStopDto', () => {
  it('accepts a UUID', async () => {
    await expect(
      collectDtoErrors(ToggleFavoriteStopDto, { stopId: UUID }),
    ).resolves.toEqual([]);
  });

  it.each(['not-a-uuid', '', '123', 12345, null])(
    'rejects %p',
    async (stopId) => {
      await expect(
        collectDtoErrors(ToggleFavoriteStopDto, { stopId }),
      ).resolves.not.toEqual([]);
    },
  );

  it('requires the field', async () => {
    await expect(
      collectDtoErrors(ToggleFavoriteStopDto, {}),
    ).resolves.not.toEqual([]);
  });

  it('strips undeclared properties', async () => {
    const result = await validateDto(ToggleFavoriteStopDto, {
      stopId: UUID,
      userId: 'someone-else',
    });

    expect(result).toEqual({ stopId: UUID });
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
