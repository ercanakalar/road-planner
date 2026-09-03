import { Injectable } from '@nestjs/common';

import { GoogleMapsClient } from './google-maps.client';
import { AddressResult, LatLng } from '../types/maps.types';
import { formatCoordinate } from '../utils/coordinates';
import { cleanAddress } from '../utils/address';
import { createTtlCache } from '../utils/ttl-cache';

const CACHE = { ttlMs: 24 * 60 * 60 * 1000, maxEntries: 1000 };

export const UNNAMED_PLACE: AddressResult = {
  address: 'Dropped pin',
  country: '',
  province: '',
  district: '',
};

const PROVINCE_TYPES = ['administrative_area_level_1', 'locality'];

const DISTRICT_TYPES = [
  'administrative_area_level_2',
  'sublocality',
  'sublocality_level_1',
];

interface GeocodeComponent {
  long_name?: string;
  types?: string[];
}

interface GeocodeResponse {
  status: string;
  results?: {
    formatted_address?: string;
    address_components?: GeocodeComponent[];
  }[];
}

const pickComponent = (
  components: readonly GeocodeComponent[],
  types: readonly string[],
): string =>
  components.find((component) =>
    types.some((type) => component.types?.includes(type)),
  )?.long_name ?? '';

@Injectable()
export class GeocodingService {
  private readonly cache = createTtlCache<AddressResult>(CACHE);

  constructor(private client: GoogleMapsClient) {}

  async reverseGeocode(coordinate: LatLng): Promise<AddressResult> {
    const latlng = formatCoordinate(coordinate);

    return this.cache.resolve(latlng, async () => {
      const body = await this.client.get<GeocodeResponse>('/geocode/json', {
        latlng,
      });

      const result = body.results?.[0];
      if (!result) return UNNAMED_PLACE;

      const components = result.address_components ?? [];

      const address = cleanAddress(result.formatted_address);

      return {
        address: address || UNNAMED_PLACE.address,
        country: pickComponent(components, ['country']),
        province: pickComponent(components, PROVINCE_TYPES),
        district: pickComponent(components, DISTRICT_TYPES),
      };
    });
  }

  /**
   * The address to label a saved stop with: what the caller already knows if it
   * knows anything, and Google's answer otherwise. Never throws — a stop with
   * no name is worth keeping, a failed save is not.
   */
  async resolveAddress(coordinate: LatLng, supplied?: string): Promise<string> {
    // A supplied address is whatever a client sent, so it is cleaned on the
    // same terms as Google's — this is the one door everything stored comes
    // through.
    const given = cleanAddress(supplied);
    if (given) return given;

    return this.reverseGeocode(coordinate)
      .then((result) => result.address)
      .catch(() => UNNAMED_PLACE.address);
  }
}
