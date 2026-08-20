import { MapsController } from './maps.controller';
import { DirectionsService } from './services/directions.service';
import { GeocodingService } from './services/geocoding.service';
import { PlacesService } from './services/places.service';
import { RouteSearchService } from './services/route-search.service';
import { TRANSPORT_MODES } from './types/maps.types';

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784 };
const ANKARA = { latitude: 39.9334, longitude: 32.8597 };

const ROUTE = {
  mode: 'driving' as const,
  coordinates: [ISTANBUL, ANKARA],
  durationSeconds: 1800,
  distanceMeters: 45_000,
};

describe('MapsController', () => {
  let directions: { route: jest.Mock; durations: jest.Mock };
  let geocoding: { reverseGeocode: jest.Mock };
  let places: { autocomplete: jest.Mock; placeDetails: jest.Mock };
  let routeSearch: { search: jest.Mock };
  let controller: MapsController;

  beforeEach(() => {
    directions = { route: jest.fn(), durations: jest.fn() };
    geocoding = { reverseGeocode: jest.fn() };
    places = { autocomplete: jest.fn(), placeDetails: jest.fn() };
    routeSearch = { search: jest.fn() };

    controller = new MapsController(
      directions as unknown as DirectionsService,
      geocoding as unknown as GeocodingService,
      places as unknown as PlacesService,
      routeSearch as unknown as RouteSearchService,
    );
  });

  describe('getDirections', () => {
    it('answers with the route in the standard envelope', async () => {
      directions.route.mockResolvedValue(ROUTE);

      await expect(
        controller.getDirections({ origin: ISTANBUL, destination: ANKARA }),
      ).resolves.toMatchObject({ status: 'success', data: ROUTE });
    });

    it('says so when there is no route, rather than failing', async () => {
      directions.route.mockResolvedValue(null);

      await expect(
        controller.getDirections({ origin: ISTANBUL, destination: ANKARA }),
      ).resolves.toMatchObject({
        data: null,
        message: 'No route between those points',
      });
    });
  });

  describe('getDurations', () => {
    it('asks for every mode when the caller named none', async () => {
      directions.durations.mockResolvedValue({});

      await controller.getDurations({ origin: ISTANBUL, destination: ANKARA });

      expect(directions.durations).toHaveBeenCalledWith(
        { origin: ISTANBUL, destination: ANKARA },
        TRANSPORT_MODES,
      );
    });

    it('asks only for the modes the caller named', async () => {
      directions.durations.mockResolvedValue({});

      await controller.getDurations({
        origin: ISTANBUL,
        destination: ANKARA,
        modes: ['driving'],
      });

      expect(directions.durations).toHaveBeenCalledWith(
        { origin: ISTANBUL, destination: ANKARA },
        ['driving'],
      );
    });

    it('does not pass the mode list on as a route waypoint', async () => {
      directions.durations.mockResolvedValue({});

      await controller.getDurations({
        origin: ISTANBUL,
        destination: ANKARA,
        modes: ['driving'],
      });

      expect(directions.durations.mock.calls[0][0]).not.toHaveProperty('modes');
    });

    it('answers with the durations it was given', async () => {
      directions.durations.mockResolvedValue({ driving: 1800 });

      await expect(
        controller.getDurations({ origin: ISTANBUL, destination: ANKARA }),
      ).resolves.toMatchObject({ data: { driving: 1800 } });
    });
  });

  describe('reverseGeocode', () => {
    it('answers with the address for the coordinates', async () => {
      const address = {
        address: 'Bağdat Cd. 1',
        country: 'Türkiye',
        province: 'İstanbul',
        district: 'Kadıköy',
      };
      geocoding.reverseGeocode.mockResolvedValue(address);

      await expect(controller.reverseGeocode(ISTANBUL)).resolves.toMatchObject({
        data: address,
      });
      expect(geocoding.reverseGeocode).toHaveBeenCalledWith(ISTANBUL);
    });
  });

  describe('searchPlaces', () => {
    it('passes the query and session token through', async () => {
      places.autocomplete.mockResolvedValue([]);

      await controller.searchPlaces({ input: 'kadikoy', sessionToken: 'abc' });

      expect(places.autocomplete).toHaveBeenCalledWith('kadikoy', 'abc');
    });

    it('answers with the suggestions', async () => {
      const predictions = [{ placeId: 'a', description: 'Kadıköy' }];
      places.autocomplete.mockResolvedValue(predictions);

      await expect(
        controller.searchPlaces({ input: 'kadikoy' }),
      ).resolves.toMatchObject({ data: predictions });
    });
  });

  describe('getPlace', () => {
    it('answers with where the place is', async () => {
      const place = { ...ISTANBUL, address: 'Kadıköy' };
      places.placeDetails.mockResolvedValue(place);

      await expect(controller.getPlace('place-id', {})).resolves.toMatchObject({
        data: place,
      });
      expect(places.placeDetails).toHaveBeenCalledWith('place-id', undefined);
    });

    it('says so when the place has no location', async () => {
      places.placeDetails.mockResolvedValue(null);

      await expect(controller.getPlace('place-id', {})).resolves.toMatchObject({
        data: null,
        message: 'That place has no location',
      });
    });
  });

  describe('searchAlongRoute', () => {
    const found = {
      places: [
        {
          placeId: 'a',
          name: 'Çiya Sofrası',
          address: 'Caferağa',
          latitude: 40.99,
          longitude: 29.02,
          types: ['restaurant'],
          distanceFromRouteMeters: 320,
          distanceAlongRouteMeters: 12_000,
          detourMeters: 640,
          insertAfterIndex: 0,
        },
      ],
      radiusMeters: 2000,
      routeDistanceMeters: 45_000,
      routeDurationSeconds: 1800,
      mode: 'driving' as const,
      searchedPoints: 7,
      coversWholeRoute: true,
    };

    const search = { origin: ISTANBUL, destination: ANKARA };

    it('answers with what it found along the route', async () => {
      routeSearch.search.mockResolvedValue(found);

      await expect(
        controller.searchAlongRoute({ ...search, category: 'restaurant' }),
      ).resolves.toMatchObject({
        status: 'success',
        data: found,
        message: '1 place along your route',
      });
    });

    it('fills in the defaults the app did not choose', async () => {
      routeSearch.search.mockResolvedValue(found);

      await controller.searchAlongRoute({ ...search, category: 'cafe' });

      expect(routeSearch.search).toHaveBeenCalledWith({
        ...search,
        category: 'cafe',
        radiusMeters: 2000,
        limit: 20,
        sortBy: 'detour',
      });
    });

    it('passes a typed query on as the keyword to match', async () => {
      routeSearch.search.mockResolvedValue(found);

      await controller.searchAlongRoute({
        ...search,
        query: 'sushi',
        radiusMeters: 500,
        limit: 5,
        sortBy: 'rating',
        openNow: true,
        minRating: 4,
      });

      expect(routeSearch.search).toHaveBeenCalledWith({
        ...search,
        keyword: 'sushi',
        radiusMeters: 500,
        limit: 5,
        sortBy: 'rating',
        openNow: true,
        minRating: 4,
      });
    });

    it('does not pass the query on under a name the service ignores', async () => {
      routeSearch.search.mockResolvedValue(found);

      await controller.searchAlongRoute({ ...search, query: 'sushi' });

      expect(routeSearch.search.mock.calls[0][0]).not.toHaveProperty('query');
    });

    it('says when the route was too long to search all of', async () => {
      routeSearch.search.mockResolvedValue({
        ...found,
        coversWholeRoute: false,
      });

      await expect(
        controller.searchAlongRoute({ ...search, category: 'restaurant' }),
      ).resolves.toMatchObject({
        message: '1 place along your route, from part of it',
      });
    });

    it('says when the route has nothing of the kind on it', async () => {
      routeSearch.search.mockResolvedValue({ ...found, places: [] });

      await expect(
        controller.searchAlongRoute({ ...search, category: 'restaurant' }),
      ).resolves.toMatchObject({
        data: { places: [] },
        message: 'Nothing matching along this route',
      });
    });

    it('says when there is no route to search along', async () => {
      routeSearch.search.mockResolvedValue(null);

      await expect(
        controller.searchAlongRoute({ ...search, category: 'restaurant' }),
      ).resolves.toMatchObject({
        data: null,
        message: 'No route between those points',
      });
    });
  });
});
