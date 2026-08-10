import * as Location from 'expo-location';

import { resolveRegion } from './useInitialRegion';
import { TURKEY_REGION } from 'constants/regions';

const mockPermission = (status: string) =>
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status,
  });

const mockPosition = (latitude: number, longitude: number) =>
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude, longitude },
  });

describe('resolveRegion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('centres on the device when permission is granted', async () => {
    mockPermission('granted');
    mockPosition(41.0082, 28.9784);

    const { region, status } = await resolveRegion();

    expect(status).toBe('granted');
    expect(region.latitude).toBeCloseTo(41.0082);
    expect(region.longitude).toBeCloseTo(28.9784);
    expect(region.latitudeDelta).toBeLessThan(1);
  });

  it('falls back to the whole of Turkey when permission is denied', async () => {
    mockPermission('denied');

    const { region, status } = await resolveRegion();

    expect(status).toBe('denied');
    expect(region).toEqual(TURKEY_REGION);
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('falls back when location services throw', async () => {
    mockPermission('granted');
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error('location services are off'),
    );

    const { region, status } = await resolveRegion();

    expect(status).toBe('unavailable');
    expect(region).toEqual(TURKEY_REGION);
  });
});

describe('TURKEY_REGION', () => {
  it('is wide enough to contain the country', () => {
    const north = TURKEY_REGION.latitude + TURKEY_REGION.latitudeDelta / 2;
    const south = TURKEY_REGION.latitude - TURKEY_REGION.latitudeDelta / 2;
    const east = TURKEY_REGION.longitude + TURKEY_REGION.longitudeDelta / 2;
    const west = TURKEY_REGION.longitude - TURKEY_REGION.longitudeDelta / 2;

    expect(north).toBeGreaterThanOrEqual(42);
    expect(south).toBeLessThanOrEqual(36);
    expect(east).toBeGreaterThanOrEqual(45);
    expect(west).toBeLessThanOrEqual(26);
  });
});
