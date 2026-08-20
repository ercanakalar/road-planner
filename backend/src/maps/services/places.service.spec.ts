import { GoogleMapsClient } from './google-maps.client';
import { PlacesService } from './places.service';

const PLACE_ID = 'ChIJAWzD-p65yhQR3f5A5tRfBQw';

const SESSION = 'session-token';

const predictionsBody = {
  status: 'OK',
  predictions: [
    { place_id: PLACE_ID, description: 'Kadıköy, İstanbul' },
    { place_id: 'other', description: 'Kadıköy Rıhtım' },
  ],
};

const KADIKOY = { latitude: 40.9903, longitude: 29.0275 };

const nearbyBody = {
  status: 'OK',
  results: [
    {
      place_id: PLACE_ID,
      name: 'Çiya Sofrası',
      vicinity: 'Caferağa, Güneşli Bahçe Sk. 43',
      geometry: { location: { lat: 40.9899, lng: 29.0271 } },
      rating: 4.5,
      user_ratings_total: 12_000,
      price_level: 2,
      opening_hours: { open_now: true },
      types: ['restaurant', 'food'],
    },
  ],
};

const detailsBody = {
  status: 'OK',
  result: {
    geometry: { location: { lat: 40.9903, lng: 29.0275 } },
    formatted_address: 'Kadıköy, İstanbul',
    name: 'Kadıköy',
  },
};

describe('PlacesService', () => {
  let client: { get: jest.Mock };
  let service: PlacesService;

  const paramsOf = (call = 0) => client.get.mock.calls[call][1];

  beforeEach(() => {
    client = { get: jest.fn() };
    service = new PlacesService(client as unknown as GoogleMapsClient);
  });

  describe('autocomplete', () => {
    it('returns each suggestion as an id and a label', async () => {
      client.get.mockResolvedValue(predictionsBody);

      await expect(service.autocomplete('kadikoy')).resolves.toEqual([
        { placeId: PLACE_ID, description: 'Kadıköy, İstanbul' },
        { placeId: 'other', description: 'Kadıköy Rıhtım' },
      ]);
    });

    it('passes the session token through, so Google bills one session', async () => {
      client.get.mockResolvedValue(predictionsBody);

      await service.autocomplete('kadikoy', SESSION);

      expect(client.get).toHaveBeenCalledWith('/place/autocomplete/json', {
        input: 'kadikoy',
        sessiontoken: SESSION,
      });
    });

    it('omits the session token when there is none', async () => {
      client.get.mockResolvedValue(predictionsBody);

      await service.autocomplete('kadikoy');

      expect(paramsOf()).not.toHaveProperty('sessiontoken');
    });

    it('returns nothing when Google has no suggestions', async () => {
      client.get.mockResolvedValue({ status: 'ZERO_RESULTS' });

      await expect(service.autocomplete('zzzz')).resolves.toEqual([]);
    });

    it('drops a suggestion with no place id, which cannot be looked up', async () => {
      client.get.mockResolvedValue({
        status: 'OK',
        predictions: [{ description: 'Nowhere' }, { place_id: PLACE_ID }],
      });

      await expect(service.autocomplete('now')).resolves.toEqual([
        { placeId: PLACE_ID, description: '' },
      ]);
    });

    it('asks once for a query repeated within a session', async () => {
      client.get.mockResolvedValue(predictionsBody);

      await service.autocomplete('Kadikoy', SESSION);
      await service.autocomplete('kadikoy', SESSION);

      expect(client.get).toHaveBeenCalledTimes(1);
    });

    it('does not serve one session the results cached for another', async () => {
      client.get.mockResolvedValue(predictionsBody);

      await service.autocomplete('kadikoy', SESSION);
      await service.autocomplete('kadikoy', 'another-session');

      expect(client.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('placeDetails', () => {
    it('returns where the place is and what it is called', async () => {
      client.get.mockResolvedValue(detailsBody);

      await expect(service.placeDetails(PLACE_ID)).resolves.toEqual({
        latitude: 40.9903,
        longitude: 29.0275,
        address: 'Kadıköy, İstanbul',
      });
    });

    it('asks only for the fields it uses, since Google bills per field', async () => {
      client.get.mockResolvedValue(detailsBody);

      await service.placeDetails(PLACE_ID, SESSION);

      expect(client.get).toHaveBeenCalledWith('/place/details/json', {
        place_id: PLACE_ID,
        fields: 'geometry/location,formatted_address,name',
        sessiontoken: SESSION,
      });
    });

    it('falls back to the place name when there is no formatted address', async () => {
      client.get.mockResolvedValue({
        status: 'OK',
        result: { geometry: { location: { lat: 1, lng: 2 } }, name: 'Kadıköy' },
      });

      await expect(service.placeDetails(PLACE_ID)).resolves.toMatchObject({
        address: 'Kadıköy',
      });
    });

    it('returns null for a place with no location', async () => {
      client.get.mockResolvedValue({ status: 'OK', result: {} });

      await expect(service.placeDetails(PLACE_ID)).resolves.toBeNull();
    });

    it('returns null when the place is not found', async () => {
      client.get.mockResolvedValue({ status: 'ZERO_RESULTS' });

      await expect(service.placeDetails(PLACE_ID)).resolves.toBeNull();
    });

    it('asks once for a place looked up twice', async () => {
      client.get.mockResolvedValue(detailsBody);

      await service.placeDetails(PLACE_ID);
      await service.placeDetails(PLACE_ID);

      expect(client.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('nearby', () => {
    it('returns the places Google found, in the shape the app shows them', async () => {
      client.get.mockResolvedValue(nearbyBody);

      await expect(
        service.nearby({ location: KADIKOY, radiusMeters: 1500 }),
      ).resolves.toEqual([
        {
          placeId: PLACE_ID,
          name: 'Çiya Sofrası',
          address: 'Caferağa, Güneşli Bahçe Sk. 43',
          latitude: 40.9899,
          longitude: 29.0271,
          rating: 4.5,
          ratingCount: 12_000,
          priceLevel: 2,
          openNow: true,
          types: ['restaurant', 'food'],
        },
      ]);
    });

    it('asks Google around the point, at the radius given', async () => {
      client.get.mockResolvedValue(nearbyBody);

      await service.nearby({
        location: KADIKOY,
        radiusMeters: 1500.4,
        keyword: 'kebap',
        category: 'restaurant',
      });

      expect(client.get).toHaveBeenCalledWith('/place/nearbysearch/json', {
        location: '40.990300,29.027500',
        radius: '1500',
        keyword: 'kebap',
        type: 'restaurant',
      });
    });

    it('sends the open-now flag only when it is asked for', async () => {
      client.get.mockResolvedValue(nearbyBody);

      await service.nearby({
        location: KADIKOY,
        radiusMeters: 1000,
        openNow: true,
      });
      await service.nearby({
        location: KADIKOY,
        radiusMeters: 1000,
        openNow: false,
      });

      expect(paramsOf(0)).toMatchObject({ opennow: 'true' });
      expect(paramsOf(1)).not.toHaveProperty('opennow');
    });

    it('leaves out a place that has closed for good', async () => {
      client.get.mockResolvedValue({
        status: 'OK',
        results: [
          { ...nearbyBody.results[0], business_status: 'CLOSED_PERMANENTLY' },
        ],
      });

      await expect(
        service.nearby({ location: KADIKOY, radiusMeters: 1000 }),
      ).resolves.toEqual([]);
    });

    it('leaves out a place with no id or no location to plot it at', async () => {
      client.get.mockResolvedValue({
        status: 'OK',
        results: [
          { name: 'No id', geometry: { location: { lat: 1, lng: 2 } } },
          { place_id: 'no-location', name: 'Nowhere' },
        ],
      });

      await expect(
        service.nearby({ location: KADIKOY, radiusMeters: 1000 }),
      ).resolves.toEqual([]);
    });

    it('omits the ratings a place does not have rather than inventing zeroes', async () => {
      client.get.mockResolvedValue({
        status: 'OK',
        results: [
          {
            place_id: PLACE_ID,
            name: 'New place',
            geometry: { location: { lat: 1, lng: 2 } },
          },
        ],
      });

      const [place] = await service.nearby({
        location: KADIKOY,
        radiusMeters: 1000,
      });

      expect(place).not.toHaveProperty('rating');
      expect(place).not.toHaveProperty('openNow');
      expect(place.types).toEqual([]);
    });

    it('returns nothing when there is nothing around', async () => {
      client.get.mockResolvedValue({ status: 'ZERO_RESULTS' });

      await expect(
        service.nearby({ location: KADIKOY, radiusMeters: 1000 }),
      ).resolves.toEqual([]);
    });

    it('asks once for the same circle searched twice', async () => {
      client.get.mockResolvedValue(nearbyBody);

      await service.nearby({ location: KADIKOY, radiusMeters: 1000 });
      await service.nearby({ location: KADIKOY, radiusMeters: 1000 });

      expect(client.get).toHaveBeenCalledTimes(1);
    });

    it("does not answer one search with another search's results", async () => {
      client.get.mockResolvedValue(nearbyBody);

      await service.nearby({
        location: KADIKOY,
        radiusMeters: 1000,
        keyword: 'kebap',
      });
      await service.nearby({
        location: KADIKOY,
        radiusMeters: 1000,
        keyword: 'sushi',
      });

      expect(client.get).toHaveBeenCalledTimes(2);
    });
  });
});
