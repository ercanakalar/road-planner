import { Injectable } from '@nestjs/common';

import { GoogleMapsClient } from './google-maps.client';
import { AddressResult, LatLng, MapArea } from '../types/maps.types';
import { formatCoordinate } from '../utils/coordinates';
import { cleanAddress } from '../utils/address';
import {
  areaBounds,
  areaKind,
  GoogleGeometry,
  hasOutline,
} from '../utils/area';
import { createTtlCache } from '../utils/ttl-cache';

const CACHE = { ttlMs: 24 * 60 * 60 * 1000, maxEntries: 1000 };

const AREA_CACHE = { ttlMs: 24 * 60 * 60 * 1000, maxEntries: 500 };

const MAX_AREAS = 6;

const NOT_A_PLACE = ['postal_code', 'plus_code'];

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

interface GeocodeResult {
  place_id?: string;
  formatted_address?: string;
  address_components?: GeocodeComponent[];
  geometry?: GoogleGeometry;
  types?: string[];
}

interface GeocodeResponse {
  status: string;
  results?: GeocodeResult[];
}

const pickComponent = (
  components: readonly GeocodeComponent[],
  types: readonly string[],
): string =>
  components.find((component) =>
    types.some((type) => component.types?.includes(type)),
  )?.long_name ?? '';

const areaName = (result: GeocodeResult, address: string): string => {
  const components = result.address_components ?? [];

  const named = (result.types ?? [])
    .filter((type) => type !== 'political')
    .map((type) => pickComponent(components, [type]))
    .find(Boolean);

  return named || address.split(',')[0]?.trim() || address;
};

const toArea = (result: GeocodeResult): MapArea[] => {
  const location = result.geometry?.location;

  if (
    !result.place_id ||
    location?.lat === undefined ||
    location.lng === undefined ||
    (result.types ?? []).some((type) => NOT_A_PLACE.includes(type))
  ) {
    return [];
  }

  const coordinate = { latitude: location.lat, longitude: location.lng };
  const address =
    cleanAddress(result.formatted_address) || UNNAMED_PLACE.address;

  return [
    {
      ...coordinate,
      placeId: result.place_id,
      name: areaName(result, address),
      address,
      kind: areaKind(result.types),
      bounds: areaBounds(result.geometry, coordinate),
    },
  ];
};

@Injectable()
export class GeocodingService {
  private readonly cache = createTtlCache<AddressResult>(CACHE);

  private readonly areas = createTtlCache<MapArea[]>(AREA_CACHE);

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

  async areasAt(coordinate: LatLng): Promise<MapArea[]> {
    const latlng = formatCoordinate(coordinate);

    return this.areas.resolve(latlng, async () => {
      const body = await this.client.get<GeocodeResponse>('/geocode/json', {
        latlng,
      });

      const results = body.results ?? [];
      const outlined = results.filter((result) => hasOutline(result.geometry));

      const areas = (outlined.length > 0 ? outlined : results.slice(0, 1))
        .flatMap(toArea)
        .filter(
          (area, index, all) =>
            all.findIndex((other) => other.placeId === area.placeId) === index,
        );

      return areas.slice(0, MAX_AREAS);
    });
  }

  async resolveAddress(coordinate: LatLng, supplied?: string): Promise<string> {
    const given = cleanAddress(supplied);
    if (given) return given;

    return this.reverseGeocode(coordinate)
      .then((result) => result.address)
      .catch(() => UNNAMED_PLACE.address);
  }
}
