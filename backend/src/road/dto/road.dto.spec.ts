import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import {
  AddStopDto,
  CreateRoadDto,
  ReorderStopsDto,
  UpdateRoadDto,
  UpdateStopDto,
  StopInputDto,
} from './road.dto';

const UUID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';

const address = () => 'Bağdat Cd. 1, Kadıköy/İstanbul, Türkiye';

const stop = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  latitude: 40.99,
  longitude: 29.03,
  order: 1,
  address: address(),
  ...overrides,
});

describe('StopInputDto', () => {
  it('accepts a valid stop', async () => {
    await expect(
      collectDtoErrors(StopInputDto, stop()),
    ).resolves.toEqual([]);
  });

  describe('coordinate bounds', () => {
    it.each([
      ['latitude', 91],
      ['latitude', -91],
      ['longitude', 181],
      ['longitude', -181],
    ])('rejects %s of %p', async (field, value) => {
      await expect(
        collectDtoErrors(StopInputDto, stop({ [field]: value })),
      ).resolves.not.toEqual([]);
    });

    it.each([
      ['latitude', 90],
      ['latitude', -90],
      ['longitude', 180],
      ['longitude', -180],
      ['latitude', 0],
    ])('accepts %s of %p', async (field, value) => {
      await expect(
        collectDtoErrors(StopInputDto, stop({ [field]: value })),
      ).resolves.toEqual([]);
    });

    it.each(['not-a-number', null, {}, []])(
      'rejects a latitude of %p',
      async (latitude) => {
        await expect(
          collectDtoErrors(StopInputDto, stop({ latitude })),
        ).resolves.not.toEqual([]);
      },
    );
  });

  describe('order', () => {
    it('rejects a negative order', async () => {
      await expect(
        collectDtoErrors(StopInputDto, stop({ order: -1 })),
      ).resolves.not.toEqual([]);
    });

    it('rejects a fractional order', async () => {
      await expect(
        collectDtoErrors(StopInputDto, stop({ order: 1.5 })),
      ).resolves.not.toEqual([]);
    });
  });

  describe('type', () => {
    it('accepts a stop with no type', async () => {
      const { type: _type, ...withoutType } = stop({ type: 'start' });

      await expect(
        collectDtoErrors(StopInputDto, withoutType),
      ).resolves.toEqual([]);
    });

    it.each(['start', 'end', 'stop'])('accepts type %p', async (type) => {
      await expect(
        collectDtoErrors(StopInputDto, stop({ type })),
      ).resolves.toEqual([]);
    });

    it('rejects an unknown type', async () => {
      await expect(
        collectDtoErrors(StopInputDto, stop({ type: 'midpoint' })),
      ).resolves.not.toEqual([]);
    });
  });

  it('rejects a non-UUID id', async () => {
    await expect(
      collectDtoErrors(StopInputDto, stop({ id: 'not-a-uuid' })),
    ).resolves.not.toEqual([]);
  });

  it('rejects an address that is not text', async () => {
    await expect(
      collectDtoErrors(StopInputDto, stop({ address: 12345 })),
    ).resolves.not.toEqual([]);
  });

  it('rejects the address object the old API took', async () => {
    // The column is a single string now; a client still sending the old
    // shape should be told, not silently stored as "[object Object]".
    await expect(
      collectDtoErrors(
        StopInputDto,
        stop({ address: { address: 'Bağdat Cd. 1' } }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('trims the address', async () => {
    const result = await validateDto(
      StopInputDto,
      stop({ address: '  Bağdat Cd. 1  ' }),
    );

    expect(result.address).toBe('Bağdat Cd. 1');
  });
});

describe('CreateRoadDto', () => {
  const valid = () => ({
    title: 'Morning commute',
    description: 'Home to office',
    stops: [stop({ order: 1 }), stop({ order: 2 })],
  });

  it('accepts a valid road', async () => {
    await expect(collectDtoErrors(CreateRoadDto, valid())).resolves.toEqual([]);
  });

  it('accepts a road with no stops', async () => {
    await expect(
      collectDtoErrors(CreateRoadDto, {
        title: 'Empty',
        description: 'No stops yet',
      }),
    ).resolves.toEqual([]);
  });

  it('requires a title', async () => {
    await expect(
      collectDtoErrors(CreateRoadDto, { description: 'x' }),
    ).resolves.not.toEqual([]);
  });

  it('requires a description', async () => {
    await expect(
      collectDtoErrors(CreateRoadDto, { title: 'x' }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a title longer than 255 characters', async () => {
    await expect(
      collectDtoErrors(CreateRoadDto, { ...valid(), title: 'a'.repeat(256) }),
    ).resolves.not.toEqual([]);
  });

  it('rejects more than 500 stops', async () => {
    const stops = Array.from({ length: 501 }, (_, i) =>
      stop({ order: i }),
    );

    await expect(
      collectDtoErrors(CreateRoadDto, { ...valid(), stops }),
    ).resolves.not.toEqual([]);
  });

  it('validates each stop in the array', async () => {
    const stops = [stop(), stop({ latitude: 200 })];

    await expect(
      collectDtoErrors(CreateRoadDto, { ...valid(), stops }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a non-array stops value', async () => {
    await expect(
      collectDtoErrors(CreateRoadDto, { ...valid(), stops: 'nope' }),
    ).resolves.not.toEqual([]);
  });

  it('strips server-side fields the client echoes back', async () => {
    const result = await validateDto(UpdateRoadDto, {
      title: 'T',
      description: 'D',
      userId: 'attacker-id',
      stops: [
        {
          ...stop(),
          id: UUID,
          roadId: UUID,
          addressInfoId: UUID,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          deletedAt: null,
          favoriteStops: [],
          isFavorite: true,
        },
      ],
    });

    expect(result).not.toHaveProperty('userId');
    expect(result.stops?.[0]).not.toHaveProperty('roadId');
    expect(result.stops?.[0]).not.toHaveProperty('createdAt');
    expect(result.stops?.[0]).not.toHaveProperty('favoriteStops');
    expect(result.stops?.[0].id).toBe(UUID);
  });

  it('accepts the client payload that would otherwise 400', async () => {
    const result = await validateDto(UpdateRoadDto, {
      title: 'T',
      description: 'D',
      stops: [
        {
          ...stop(),
          id: UUID,
          roadId: UUID,
          createdAt: '2026-01-01T00:00:00Z',
          address: address(),
        },
      ],
    });

    expect(result.stops).toHaveLength(1);
  });
});

describe('AddStopDto', () => {
  const valid = () => ({
    latitude: 40.99,
    longitude: 29.03,
    order: 1,
    address: address(),
  });

  it('accepts the payload the shipped client sends', async () => {
    await expect(collectDtoErrors(AddStopDto, valid())).resolves.toEqual(
      [],
    );
  });

  it('accepts coordinates alone, since the server geocodes them', async () => {
    const { address: _address, ...withoutAddress } = valid();

    await expect(
      collectDtoErrors(AddStopDto, withoutAddress),
    ).resolves.toEqual([]);
  });

  it('rejects an address that is not text', async () => {
    await expect(
      collectDtoErrors(AddStopDto, { ...valid(), address: 12345 }),
    ).resolves.not.toEqual([]);
  });

  it('rejects out-of-range coordinates', async () => {
    await expect(
      collectDtoErrors(AddStopDto, { ...valid(), latitude: 999 }),
    ).resolves.not.toEqual([]);
  });
});

describe('UpdateStopDto', () => {
  const clientPayload = () => ({
    latitude: 40.99,
    longitude: 29.03,
    address: address(),
  });

  it('accepts the payload the shipped client sends', async () => {
    await expect(
      collectDtoErrors(UpdateStopDto, clientPayload()),
    ).resolves.toEqual([]);
  });

  it('accepts an explicit order', async () => {
    await expect(
      collectDtoErrors(UpdateStopDto, { ...clientPayload(), order: 3 }),
    ).resolves.toEqual([]);
  });

  it('accepts a move with no address, since the server geocodes it', async () => {
    const { address: _address, ...withoutAddress } = clientPayload();

    await expect(
      collectDtoErrors(UpdateStopDto, withoutAddress),
    ).resolves.toEqual([]);
  });

  it('requires coordinates', async () => {
    await expect(
      collectDtoErrors(UpdateStopDto, { address: address() }),
    ).resolves.not.toEqual([]);
  });
});

describe('ReorderStopsDto', () => {
  it('accepts the payload the shipped client sends', async () => {
    await expect(
      collectDtoErrors(ReorderStopsDto, { roadId: UUID, from: 0, to: 2 }),
    ).resolves.toEqual([]);
  });

  it('accepts a payload with no roadId, since the path supplies it', async () => {
    await expect(
      collectDtoErrors(ReorderStopsDto, { from: 0, to: 2 }),
    ).resolves.toEqual([]);
  });

  it.each([-1, 1.5, 'first', null])('rejects a from of %p', async (from) => {
    await expect(
      collectDtoErrors(ReorderStopsDto, { from, to: 1 }),
    ).resolves.not.toEqual([]);
  });

  it.each([-1, 2.5, 'last', null])('rejects a to of %p', async (to) => {
    await expect(
      collectDtoErrors(ReorderStopsDto, { from: 0, to }),
    ).resolves.not.toEqual([]);
  });

  it('requires both indices', async () => {
    await expect(
      collectDtoErrors(ReorderStopsDto, { from: 0 }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a non-UUID roadId', async () => {
    await expect(
      collectDtoErrors(ReorderStopsDto, {
        roadId: 'nope',
        from: 0,
        to: 1,
      }),
    ).resolves.not.toEqual([]);
  });
});
