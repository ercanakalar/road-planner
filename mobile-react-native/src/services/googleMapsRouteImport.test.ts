import { importGoogleMapsRoute } from './googleMapsRouteImport';
import {
  createSessionToken,
  fetchPlaceDetails,
  fetchPlacePredictions,
  reverseGeocode,
} from './mapsService';

jest.mock('./mapsService', () => ({
  createSessionToken: jest.fn(() => 'token'),
  fetchPlacePredictions: jest.fn(),
  fetchPlaceDetails: jest.fn(),
  reverseGeocode: jest.fn(),
}));

const predictions = fetchPlacePredictions as jest.Mock;
const details = fetchPlaceDetails as jest.Mock;
const geocode = reverseGeocode as jest.Mock;

const DIR = 'https://www.google.com/maps/dir/?api=1';

beforeEach(() => {
  jest.clearAllMocks();
  predictions.mockResolvedValue([{ placeId: 'p1', description: 'A place' }]);
  details.mockResolvedValue({
    latitude: 41,
    longitude: 29,
    address: 'A place, İstanbul',
  });
  geocode.mockResolvedValue({
    address: 'Somewhere',
    country: '',
    province: '',
    district: '',
  });
});

describe('importGoogleMapsRoute', () => {
  it('returns null when the link holds no route', async () => {
    await expect(importGoogleMapsRoute('https://example.com')).resolves.toBeNull();
  });

  it('places a named stop by looking it up', async () => {
    const result = await importGoogleMapsRoute(
      `${DIR}&origin=Kadikoy&destination=Uskudar`,
    );

    expect(result?.resolved).toHaveLength(2);
    expect(result?.resolved[0]).toEqual({
      latitude: 41,
      longitude: 29,
      address: 'A place, İstanbul',
      label: 'A place, İstanbul',
    });
  });

  it('uses a place id from the link instead of searching for the words', async () => {
    await importGoogleMapsRoute(
      `${DIR}&origin=Kadikoy&destination=Uskudar&origin_place_id=given`,
    );

    expect(details).toHaveBeenCalledWith('given', 'token');
    // Only the destination had to be searched for.
    expect(predictions).toHaveBeenCalledTimes(1);
  });

  it('reverse-geocodes a coordinate rather than searching for it', async () => {
    const result = await importGoogleMapsRoute(
      `${DIR}&origin=41.0082,28.9784&destination=Uskudar`,
    );

    expect(geocode).toHaveBeenCalledWith({
      latitude: 41.0082,
      longitude: 28.9784,
    });
    expect(result?.resolved[0]).toMatchObject({
      latitude: 41.0082,
      longitude: 28.9784,
      address: 'Somewhere',
    });
  });

  it('keeps a coordinate whose address could not be looked up', async () => {
    geocode.mockRejectedValue(new Error('offline'));

    const result = await importGoogleMapsRoute(
      `${DIR}&origin=41.0082,28.9784&destination=Uskudar`,
    );

    // The point is what makes the stop; the name is decoration.
    expect(result?.resolved[0]).toMatchObject({
      latitude: 41.0082,
      address: '',
      label: '41.00820, 28.97840',
    });
  });

  it('lists a stop nothing could place instead of dropping it silently', async () => {
    predictions.mockResolvedValueOnce([]);

    const result = await importGoogleMapsRoute(
      `${DIR}&origin=Nowhere&destination=Uskudar`,
    );

    expect(result?.unresolved).toEqual(['Nowhere']);
    expect(result?.resolved).toHaveLength(1);
  });

  it('survives a lookup that throws', async () => {
    predictions.mockRejectedValueOnce(new Error('network'));

    const result = await importGoogleMapsRoute(
      `${DIR}&origin=Nowhere&destination=Uskudar`,
    );

    expect(result?.unresolved).toEqual(['Nowhere']);
    expect(result?.resolved).toHaveLength(1);
  });

  it('keeps the stops in travelling order', async () => {
    details
      .mockResolvedValueOnce({ latitude: 1, longitude: 1, address: 'A' })
      .mockResolvedValueOnce({ latitude: 2, longitude: 2, address: 'B' })
      .mockResolvedValueOnce({ latitude: 3, longitude: 3, address: 'C' });

    const result = await importGoogleMapsRoute(
      `${DIR}&origin=A&destination=C&waypoints=B`,
    );

    expect(result?.resolved.map((stop) => stop.address)).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('carries the travel mode through', async () => {
    const result = await importGoogleMapsRoute(
      `${DIR}&origin=A&destination=B&travelmode=walking`,
    );

    expect(result?.mode).toBe('walking');
  });

  it('caps how many stops one link may bring in', async () => {
    const many = Array.from({ length: 40 }, (_, i) => `stop${i}`).join('|');

    const result = await importGoogleMapsRoute(
      `${DIR}&origin=A&destination=B&waypoints=${many}`,
    );

    expect(result?.stops).toHaveLength(25);
  });

  it('shares one session token across the whole import', async () => {
    await importGoogleMapsRoute(`${DIR}&origin=A&destination=B&waypoints=C`);

    // Google bills autocomplete per session, so one link is one session.
    expect(createSessionToken).toHaveBeenCalledTimes(1);
  });
});

describe('short links', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('follows the redirect before trying to read a route', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      url: `${DIR}&origin=Kadikoy&destination=Uskudar`,
    }) as unknown as typeof fetch;

    const result = await importGoogleMapsRoute('https://maps.app.goo.gl/abc');

    expect(global.fetch).toHaveBeenCalled();
    expect(result?.resolved).toHaveLength(2);
  });

  it('gives up cleanly when the redirect cannot be followed', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    // The short link itself names no stops, so there is nothing to import.
    await expect(
      importGoogleMapsRoute('https://maps.app.goo.gl/abc'),
    ).resolves.toBeNull();
  });
});
