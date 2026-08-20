import { Injectable } from '@nestjs/common';

import { GoogleMapsClient } from './google-maps.client';
import {
  NearbyPlace,
  NearbySearchRequest,
  PlaceDetails,
  PlacePrediction,
} from '../types/maps.types';
import { formatCoordinate } from '../utils/coordinates';
import { createTtlCache } from '../utils/ttl-cache';

const PREDICTION_CACHE = { ttlMs: 5 * 60 * 1000, maxEntries: 500 };

const DETAILS_CACHE = { ttlMs: 24 * 60 * 60 * 1000, maxEntries: 500 };

const NEARBY_CACHE = { ttlMs: 5 * 60 * 1000, maxEntries: 800 };

const DETAIL_FIELDS = 'geometry/location,formatted_address,name';

const UNNAMED_PLACE = 'Selected place';

interface AutocompleteResponse {
  status: string;
  predictions?: { place_id?: string; description?: string }[];
}

interface PlaceDetailsResponse {
  status: string;
  result?: {
    geometry?: { location?: { lat?: number; lng?: number } };
    formatted_address?: string;
    name?: string;
  };
}

interface NearbyResult {
  place_id?: string;
  name?: string;
  vicinity?: string;
  formatted_address?: string;
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { open_now?: boolean };
  types?: string[];
  geometry?: { location?: { lat?: number; lng?: number } };
}

interface NearbyResponse {
  status: string;
  results?: NearbyResult[];
}

const CLOSED_PERMANENTLY = 'CLOSED_PERMANENTLY';

const toNearbyPlace = (result: NearbyResult): NearbyPlace[] => {
  const location = result.geometry?.location;

  if (
    !result.place_id ||
    location?.lat === undefined ||
    location.lng === undefined ||
    result.business_status === CLOSED_PERMANENTLY
  ) {
    return [];
  }

  return [
    {
      placeId: result.place_id,
      name: result.name ?? UNNAMED_PLACE,
      address: result.vicinity ?? result.formatted_address ?? '',
      latitude: location.lat,
      longitude: location.lng,
      types: result.types ?? [],
      ...(result.rating === undefined ? {} : { rating: result.rating }),
      ...(result.user_ratings_total === undefined
        ? {}
        : { ratingCount: result.user_ratings_total }),
      ...(result.price_level === undefined
        ? {}
        : { priceLevel: result.price_level }),
      ...(result.opening_hours?.open_now === undefined
        ? {}
        : { openNow: result.opening_hours.open_now }),
    },
  ];
};

@Injectable()
export class PlacesService {
  private readonly predictions =
    createTtlCache<PlacePrediction[]>(PREDICTION_CACHE);

  private readonly details = createTtlCache<PlaceDetails | null>(DETAILS_CACHE);

  private readonly nearbyPlaces = createTtlCache<NearbyPlace[]>(NEARBY_CACHE);

  constructor(private client: GoogleMapsClient) {}

  async autocomplete(
    input: string,
    sessionToken?: string,
  ): Promise<PlacePrediction[]> {
    const key = `${sessionToken ?? ''}#${input.toLowerCase()}`;

    return this.predictions.resolve(key, async () => {
      const body = await this.client.get<AutocompleteResponse>(
        '/place/autocomplete/json',
        { input, ...(sessionToken ? { sessiontoken: sessionToken } : {}) },
      );

      return (body.predictions ?? []).flatMap((prediction) =>
        prediction.place_id
          ? [
              {
                placeId: prediction.place_id,
                description: prediction.description ?? '',
              },
            ]
          : [],
      );
    });
  }

  async placeDetails(
    placeId: string,
    sessionToken?: string,
  ): Promise<PlaceDetails | null> {
    return this.details.resolve(placeId, async () => {
      const body = await this.client.get<PlaceDetailsResponse>(
        '/place/details/json',
        {
          place_id: placeId,
          fields: DETAIL_FIELDS,
          ...(sessionToken ? { sessiontoken: sessionToken } : {}),
        },
      );

      const location = body.result?.geometry?.location;
      if (location?.lat === undefined || location.lng === undefined) {
        return null;
      }

      return {
        latitude: location.lat,
        longitude: location.lng,
        address:
          body.result?.formatted_address ?? body.result?.name ?? UNNAMED_PLACE,
      };
    });
  }

  async nearby({
    location,
    radiusMeters,
    keyword,
    category,
    openNow,
  }: NearbySearchRequest): Promise<NearbyPlace[]> {
    const key = [
      formatCoordinate(location),
      Math.round(radiusMeters),
      keyword?.toLowerCase() ?? '',
      category ?? '',
      openNow ? 'open' : 'any',
    ].join('#');

    return this.nearbyPlaces.resolve(key, async () => {
      const body = await this.client.get<NearbyResponse>(
        '/place/nearbysearch/json',
        {
          location: formatCoordinate(location),
          radius: String(Math.round(radiusMeters)),
          ...(keyword ? { keyword } : {}),
          ...(category ? { type: category } : {}),
          ...(openNow ? { opennow: 'true' } : {}),
        },
      );

      return (body.results ?? []).flatMap(toNearbyPlace);
    });
  }
}
