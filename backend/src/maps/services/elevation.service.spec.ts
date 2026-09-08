import { ElevationService } from './elevation.service';
import { GoogleMapsClient } from './google-maps.client';

const KADIKOY = { latitude: 40.9903, longitude: 29.0275 };
const ULUDAG = { latitude: 40.0989, longitude: 29.2211 };

const heights = (...values: (number | null | undefined)[]) => ({
  status: 'OK',
  results: values.map((elevation) =>
    elevation === undefined ? {} : { elevation },
  ),
});

describe('ElevationService', () => {
  let client: { get: jest.Mock; isConfigured: jest.Mock };
  let service: ElevationService;

  beforeEach(() => {
    client = { get: jest.fn(), isConfigured: jest.fn(() => true) };
    service = new ElevationService(client as unknown as GoogleMapsClient);
  });

  it('asks for every point in one call', async () => {
    client.get.mockResolvedValue(heights(30, 1800));

    await expect(service.elevations([KADIKOY, ULUDAG])).resolves.toEqual([
      30, 1800,
    ]);

    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledWith('/elevation/json', {
      locations: '40.990300,29.027500|40.098900,29.221100',
    });
  });

  it('answers a repeated coordinate from the cache', async () => {
    client.get.mockResolvedValue(heights(30));

    await service.elevations([KADIKOY]);
    await service.elevations([KADIKOY]);

    // Ground height does not move, so paying Google twice for it is waste.
    expect(client.get).toHaveBeenCalledTimes(1);
  });

  it('asks only for the points it has not already measured', async () => {
    client.get.mockResolvedValueOnce(heights(30));
    await service.elevations([KADIKOY]);

    client.get.mockResolvedValueOnce(heights(1800));
    await expect(service.elevations([KADIKOY, ULUDAG])).resolves.toEqual([
      30, 1800,
    ]);

    expect(client.get).toHaveBeenLastCalledWith('/elevation/json', {
      locations: '40.098900,29.221100',
    });
  });

  it('spends nothing when no point was asked about', async () => {
    await expect(service.elevations([])).resolves.toEqual([]);

    expect(client.get).not.toHaveBeenCalled();
  });

  it('answers nothing, quietly, on a server with no map key', async () => {
    client.isConfigured.mockReturnValue(false);

    await expect(service.elevations([KADIKOY, ULUDAG])).resolves.toEqual([
      null,
      null,
    ]);

    expect(client.get).not.toHaveBeenCalled();
  });

  it('leaves a stop unmeasured rather than failing the save', async () => {
    client.get.mockRejectedValue(new Error('Google is down'));

    // A route is worth storing without its heights; a Maps outage taking
    // saving a stop down with it is not a trade anyone would make.
    await expect(service.elevations([KADIKOY])).resolves.toEqual([null]);
  });

  it('drops a batch Google answered short rather than shifting the heights', async () => {
    // Two points, one height. Which stop it belongs to is unknowable, and
    // guessing puts a measured number on the wrong pin.
    client.get.mockResolvedValue(heights(30));

    await expect(service.elevations([KADIKOY, ULUDAG])).resolves.toEqual([
      null,
      null,
    ]);
  });

  it('treats a result with no elevation in it as unmeasured', async () => {
    client.get.mockResolvedValue(heights(30, undefined));

    await expect(service.elevations([KADIKOY, ULUDAG])).resolves.toEqual([
      30,
      null,
    ]);
  });

  it('reads one point through the same path as many', async () => {
    client.get.mockResolvedValue(heights(1800));

    await expect(service.elevation(ULUDAG)).resolves.toBe(1800);
  });

  it('answers a single point that could not be measured with null', async () => {
    client.get.mockRejectedValue(new Error('nope'));

    await expect(service.elevation(ULUDAG)).resolves.toBeNull();
  });
});
