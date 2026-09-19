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

/**
 * How many of the places covering one point are worth offering. Google stacks
 * a dozen of them on a city-centre tap, and the widest are the same country
 * over and over.
 */
const MAX_AREAS = 6;

/**
 * Results that are an answer to "where is this?" rather than "what is this?".
 * A postcode is a sorting office's idea of a place, and a Plus Code is a
 * coordinate with a haircut; neither is somewhere anybody has been.
 */
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

/**
 * What to call one geocode result.
 *
 * A result's own type names the component that is the result — the `locality`
 * component of a locality result is the city's name — so that is the short
 * label. Anything with no such component is an address, and the first segment
 * of it is the closest thing to a name it has.
 */
const areaName = (result: GeocodeResult, address: string): string => {
  const components = result.address_components ?? [];

  const named = (result.types ?? [])
    // Almost everything on a map is `political`, so it names nothing.
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

  /**
   * Every place that covers one point, narrowest first: the neighbourhood, the
   * city it sits in, the province, the country.
   *
   * Only results Google gave a real outline to are offered, because these are
   * meant to be shaded in and a street address would shade a box the size of
   * the street. Where nothing has an outline — out at sea, or somewhere Google
   * only knows an address for — the nearest single result stands in, so a tap
   * still answers with something.
   */
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
