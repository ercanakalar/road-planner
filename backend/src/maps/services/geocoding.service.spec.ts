import { GeocodingService, UNNAMED_PLACE } from './geocoding.service';
import { GoogleMapsClient } from './google-maps.client';

const KADIKOY = { latitude: 40.9903, longitude: 29.0275 };

const component = (long_name: string, ...types: string[]) => ({
  long_name,
  types,
});

const geocodeBody = (
  formatted_address: string,
  components: { long_name: string; types: string[] }[],
) => ({
  status: 'OK',
  results: [{ formatted_address, address_components: components }],
});

const FULL_ADDRESS = geocodeBody('Bağdat Cd. 1, Kadıköy/İstanbul', [
  component('Türkiye', 'country', 'political'),
  component('İstanbul', 'administrative_area_level_1', 'political'),
  component('Kadıköy', 'administrative_area_level_2', 'political'),
]);

describe('GeocodingService', () => {
  let client: { get: jest.Mock };
  let service: GeocodingService;

  beforeEach(() => {
    client = { get: jest.fn() };
    service = new GeocodingService(client as unknown as GoogleMapsClient);
  });

  describe('reverseGeocode', () => {
    it('asks Google for the coordinates it was given', async () => {
      client.get.mockResolvedValue(FULL_ADDRESS);

      await service.reverseGeocode(KADIKOY);

      expect(client.get).toHaveBeenCalledWith('/geocode/json', {
        latlng: '40.990300,29.027500',
      });
    });

    it('splits the result into the columns a stop is stored in', async () => {
      client.get.mockResolvedValue(FULL_ADDRESS);

      await expect(service.reverseGeocode(KADIKOY)).resolves.toEqual({
        address: 'Bağdat Cd. 1, Kadıköy/İstanbul',
        country: 'Türkiye',
        province: 'İstanbul',
        district: 'Kadıköy',
      });
    });

    it('falls back to the locality when there is no first-level area', async () => {
      client.get.mockResolvedValue(
        geocodeBody('Somewhere', [component('Bolu', 'locality', 'political')]),
      );

      await expect(service.reverseGeocode(KADIKOY)).resolves.toMatchObject({
        province: 'Bolu',
      });
    });

    it.each(['sublocality', 'sublocality_level_1'])(
      'reads a district from a %s component',
      async (type) => {
        client.get.mockResolvedValue(
          geocodeBody('Somewhere', [component('Moda', type)]),
        );

        await expect(service.reverseGeocode(KADIKOY)).resolves.toMatchObject({
          district: 'Moda',
        });
      },
    );

    it('leaves a missing component empty rather than undefined', async () => {
      client.get.mockResolvedValue(geocodeBody('Somewhere', []));

      await expect(service.reverseGeocode(KADIKOY)).resolves.toEqual({
        address: 'Somewhere',
        country: '',
        province: '',
        district: '',
      });
    });

    it('names a place Google does not know', async () => {
      client.get.mockResolvedValue({ status: 'ZERO_RESULTS', results: [] });

      await expect(service.reverseGeocode(KADIKOY)).resolves.toEqual(
        UNNAMED_PLACE,
      );
    });

    it('names a place whose result carries no address line', async () => {
      client.get.mockResolvedValue({
        status: 'OK',
        results: [{ address_components: [] }],
      });

      await expect(service.reverseGeocode(KADIKOY)).resolves.toMatchObject({
        address: UNNAMED_PLACE.address,
      });
    });

    it('asks once for a pin dropped twice in the same place', async () => {
      client.get.mockResolvedValue(FULL_ADDRESS);

      await service.reverseGeocode(KADIKOY);
      await service.reverseGeocode({ ...KADIKOY });

      expect(client.get).toHaveBeenCalledTimes(1);
    });

    it('lets an upstream failure through', async () => {
      client.get.mockRejectedValue(new Error('Map service is unavailable'));

      await expect(service.reverseGeocode(KADIKOY)).rejects.toThrow(
        'Map service is unavailable',
      );
    });
  });

  describe('resolveAddress', () => {
    it('keeps an address the caller supplied, without asking Google', async () => {
      const supplied = 'Home';

      await expect(service.resolveAddress(KADIKOY, supplied)).resolves.toBe(
        supplied,
      );
      expect(client.get).not.toHaveBeenCalled();
    });

    it('looks up an address when the caller sent none', async () => {
      client.get.mockResolvedValue(FULL_ADDRESS);

      await expect(service.resolveAddress(KADIKOY)).resolves.toBe(
        'Bağdat Cd. 1, Kadıköy/İstanbul',
      );
    });

    it('looks up an address when the one sent is blank', async () => {
      client.get.mockResolvedValue(FULL_ADDRESS);

      await expect(service.resolveAddress(KADIKOY, '')).resolves.toBe(
        'Bağdat Cd. 1, Kadıköy/İstanbul',
      );
    });

    it('cleans an address the caller supplied', async () => {
      // The client's string is user input; it goes through the same door.
      await expect(
        service.resolveAddress(KADIKOY, '7GXR+8C, Kadıköy,  , Kadıköy'),
      ).resolves.toBe('Kadıköy');
      expect(client.get).not.toHaveBeenCalled();
    });

    it('looks up an address when the supplied one was all noise', async () => {
      client.get.mockResolvedValue(FULL_ADDRESS);

      await expect(
        service.resolveAddress(KADIKOY, 'Unnamed Road, 34710'),
      ).resolves.toBe('Bağdat Cd. 1, Kadıköy/İstanbul');
    });

    it('costs the user nothing when the lookup fails', async () => {
      client.get.mockRejectedValue(new Error('Map service is unavailable'));

      // A stop with no name is worth keeping; a failed save is not.
      await expect(service.resolveAddress(KADIKOY)).resolves.toBe(
        UNNAMED_PLACE.address,
      );
    });
  });
});
