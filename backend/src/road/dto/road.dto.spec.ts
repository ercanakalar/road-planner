import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import {
  AddWaypointDto,
  CreateRoadDto,
  ReorderWaypointsDto,
  UpdateRoadDto,
  UpdateWaypointDto,
  WaypointInputDto,
} from './road.dto';

const UUID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';

const address = () => ({
  country: 'Türkiye',
  province: 'İstanbul',
  district: 'Kadıköy',
  address: 'Bağdat Cd. 1',
});

const waypoint = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  latitude: 40.99,
  longitude: 29.03,
  order: 1,
  address: address(),
  ...overrides,
});

describe('WaypointInputDto', () => {
  it('accepts a valid waypoint', async () => {
    await expect(
      collectDtoErrors(WaypointInputDto, waypoint()),
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
        collectDtoErrors(WaypointInputDto, waypoint({ [field]: value })),
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
        collectDtoErrors(WaypointInputDto, waypoint({ [field]: value })),
      ).resolves.toEqual([]);
    });

    it.each(['not-a-number', null, {}, []])(
      'rejects a latitude of %p',
      async (latitude) => {
        await expect(
          collectDtoErrors(WaypointInputDto, waypoint({ latitude })),
        ).resolves.not.toEqual([]);
      },
    );
  });

  describe('order', () => {
    it('rejects a negative order', async () => {
      await expect(
        collectDtoErrors(WaypointInputDto, waypoint({ order: -1 })),
      ).resolves.not.toEqual([]);
    });

    it('rejects a fractional order', async () => {
      await expect(
        collectDtoErrors(WaypointInputDto, waypoint({ order: 1.5 })),
      ).resolves.not.toEqual([]);
    });
  });

  describe('type', () => {
    it('accepts a waypoint with no type', async () => {
      const { type: _type, ...withoutType } = waypoint({ type: 'start' });

      await expect(
        collectDtoErrors(WaypointInputDto, withoutType),
      ).resolves.toEqual([]);
    });

    it.each(['start', 'end', 'waypoint'])('accepts type %p', async (type) => {
      await expect(
        collectDtoErrors(WaypointInputDto, waypoint({ type })),
      ).resolves.toEqual([]);
    });

    it('rejects an unknown type', async () => {
      await expect(
        collectDtoErrors(WaypointInputDto, waypoint({ type: 'midpoint' })),
      ).resolves.not.toEqual([]);
    });
  });

  it('rejects a non-UUID id', async () => {
    await expect(
      collectDtoErrors(WaypointInputDto, waypoint({ id: 'not-a-uuid' })),
    ).resolves.not.toEqual([]);
  });

  it('validates the nested address', async () => {
    await expect(
      collectDtoErrors(
        WaypointInputDto,
        waypoint({ address: { address: 12345 } }),
      ),
    ).resolves.not.toEqual([]);
  });

  it('strips unknown properties from the nested address', async () => {
    const result = await validateDto(
      WaypointInputDto,
      waypoint({ address: { ...address(), id: UUID, createdAt: 'now' } }),
    );

    expect(result.address).not.toHaveProperty('id');
    expect(result.address).not.toHaveProperty('createdAt');
  });
});

describe('CreateRoadDto', () => {
  const valid = () => ({
    title: 'Morning commute',
    description: 'Home to office',
    waypoints: [waypoint({ order: 1 }), waypoint({ order: 2 })],
  });

  it('accepts a valid road', async () => {
    await expect(collectDtoErrors(CreateRoadDto, valid())).resolves.toEqual([]);
  });

  it('accepts a road with no waypoints', async () => {
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

  it('rejects more than 500 waypoints', async () => {
    const waypoints = Array.from({ length: 501 }, (_, i) =>
      waypoint({ order: i }),
    );

    await expect(
      collectDtoErrors(CreateRoadDto, { ...valid(), waypoints }),
    ).resolves.not.toEqual([]);
  });

  it('validates each waypoint in the array', async () => {
    const waypoints = [waypoint(), waypoint({ latitude: 200 })];

    await expect(
      collectDtoErrors(CreateRoadDto, { ...valid(), waypoints }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a non-array waypoints value', async () => {
    await expect(
      collectDtoErrors(CreateRoadDto, { ...valid(), waypoints: 'nope' }),
    ).resolves.not.toEqual([]);
  });

  it('strips server-side fields the client echoes back', async () => {
    const result = await validateDto(UpdateRoadDto, {
      title: 'T',
      description: 'D',
      userId: 'attacker-id',
      waypoints: [
        {
          ...waypoint(),
          id: UUID,
          roadId: UUID,
          addressInfoId: UUID,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          deletedAt: null,
          favoriteWaypoints: [],
          isFavorite: true,
        },
      ],
    });

    expect(result).not.toHaveProperty('userId');
    expect(result.waypoints?.[0]).not.toHaveProperty('roadId');
    expect(result.waypoints?.[0]).not.toHaveProperty('createdAt');
    expect(result.waypoints?.[0]).not.toHaveProperty('favoriteWaypoints');
    expect(result.waypoints?.[0].id).toBe(UUID);
  });

  it('accepts the client payload that would otherwise 400', async () => {
    const result = await validateDto(UpdateRoadDto, {
      title: 'T',
      description: 'D',
      waypoints: [
        {
          ...waypoint(),
          id: UUID,
          roadId: UUID,
          createdAt: '2026-01-01T00:00:00Z',
          address: { ...address(), id: UUID, createdAt: 'x', deletedAt: null },
        },
      ],
    });

    expect(result.waypoints).toHaveLength(1);
  });
});

describe('AddWaypointDto', () => {
  const valid = () => ({
    latitude: 40.99,
    longitude: 29.03,
    order: 1,
    address: address(),
  });

  it('accepts the payload the shipped client sends', async () => {
    await expect(collectDtoErrors(AddWaypointDto, valid())).resolves.toEqual(
      [],
    );
  });

  it('requires an address', async () => {
    const { address: _address, ...withoutAddress } = valid();

    await expect(
      collectDtoErrors(AddWaypointDto, withoutAddress),
    ).resolves.not.toEqual([]);
  });

  it('requires the address line within the address', async () => {
    await expect(
      collectDtoErrors(AddWaypointDto, {
        ...valid(),
        address: { country: 'Türkiye' },
      }),
    ).resolves.not.toEqual([]);
  });

  it('rejects out-of-range coordinates', async () => {
    await expect(
      collectDtoErrors(AddWaypointDto, { ...valid(), latitude: 999 }),
    ).resolves.not.toEqual([]);
  });
});

describe('UpdateWaypointDto', () => {
  const clientPayload = () => ({
    latitude: 40.99,
    longitude: 29.03,
    address: address(),
  });

  it('accepts the payload the shipped client sends', async () => {
    await expect(
      collectDtoErrors(UpdateWaypointDto, clientPayload()),
    ).resolves.toEqual([]);
  });

  it('accepts an explicit order', async () => {
    await expect(
      collectDtoErrors(UpdateWaypointDto, { ...clientPayload(), order: 3 }),
    ).resolves.toEqual([]);
  });

  it('requires coordinates', async () => {
    await expect(
      collectDtoErrors(UpdateWaypointDto, { address: address() }),
    ).resolves.not.toEqual([]);
  });
});

describe('ReorderWaypointsDto', () => {
  it('accepts the payload the shipped client sends', async () => {
    await expect(
      collectDtoErrors(ReorderWaypointsDto, { roadId: UUID, from: 0, to: 2 }),
    ).resolves.toEqual([]);
  });

  it('accepts a payload with no roadId, since the path supplies it', async () => {
    await expect(
      collectDtoErrors(ReorderWaypointsDto, { from: 0, to: 2 }),
    ).resolves.toEqual([]);
  });

  it.each([-1, 1.5, 'first', null])('rejects a from of %p', async (from) => {
    await expect(
      collectDtoErrors(ReorderWaypointsDto, { from, to: 1 }),
    ).resolves.not.toEqual([]);
  });

  it.each([-1, 2.5, 'last', null])('rejects a to of %p', async (to) => {
    await expect(
      collectDtoErrors(ReorderWaypointsDto, { from: 0, to }),
    ).resolves.not.toEqual([]);
  });

  it('requires both indices', async () => {
    await expect(
      collectDtoErrors(ReorderWaypointsDto, { from: 0 }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a non-UUID roadId', async () => {
    await expect(
      collectDtoErrors(ReorderWaypointsDto, {
        roadId: 'nope',
        from: 0,
        to: 1,
      }),
    ).resolves.not.toEqual([]);
  });
});
