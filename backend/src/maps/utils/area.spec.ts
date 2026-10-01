import {
  areaBounds,
  areaCity,
  areaCountryCode,
  areaKind,
  hasOutline,
} from './area';

const KADIKOY = { latitude: 40.9903, longitude: 29.0275 };

const box = (north: number, south: number, east: number, west: number) => ({
  northeast: { lat: north, lng: east },
  southwest: { lat: south, lng: west },
});

describe('areaKind', () => {
  it.each([
    ['country', ['country', 'political']],
    ['region', ['administrative_area_level_1', 'political']],
    ['city', ['locality', 'political']],
    ['city', ['postal_town']],
    ['district', ['administrative_area_level_2', 'political']],
    ['district', ['sublocality_level_1', 'sublocality', 'political']],
    ['district', ['neighborhood', 'political']],
  ])('calls a %s what it is', (kind, types) => {
    expect(areaKind(types)).toBe(kind);
  });

  it('answers the widest type a place carries', () => {
    expect(areaKind(['country', 'locality', 'political'])).toBe('country');
  });

  it('calls anything else a place', () => {
    expect(areaKind(['restaurant', 'food', 'point_of_interest'])).toBe('place');
  });

  it('calls a place with no types at all a place', () => {
    expect(areaKind()).toBe('place');
  });
});

describe('areaBounds', () => {
  it('prefers the outline Google drew around the place itself', () => {
    expect(
      areaBounds(
        {
          bounds: box(41.2, 40.8, 29.3, 28.8),
          viewport: box(41.1, 40.9, 29.2, 28.9),
        },
        KADIKOY,
      ),
    ).toEqual({ north: 41.2, south: 40.8, east: 29.3, west: 28.8 });
  });

  it('falls back to the box Google would point a camera at', () => {
    expect(
      areaBounds({ viewport: box(41.1, 40.9, 29.2, 28.9) }, KADIKOY),
    ).toEqual({ north: 41.1, south: 40.9, east: 29.2, west: 28.9 });
  });

  it('boxes a place Google framed with nothing around the point itself', () => {
    const bounds = areaBounds(undefined, KADIKOY);

    expect(bounds.north).toBeGreaterThan(KADIKOY.latitude);
    expect(bounds.south).toBeLessThan(KADIKOY.latitude);
    expect(bounds.east).toBeGreaterThan(KADIKOY.longitude);
    expect(bounds.west).toBeLessThan(KADIKOY.longitude);
  });

  it('ignores a half-written box rather than reading a corner as zero', () => {
    const bounds = areaBounds(
      {
        bounds: { northeast: { lat: 41.2 } },
        viewport: box(41.1, 40.9, 29.2, 28.9),
      },
      KADIKOY,
    );

    expect(bounds).toEqual({
      north: 41.1,
      south: 40.9,
      east: 29.2,
      west: 28.9,
    });
  });

  it('keeps a box that crosses the 180th meridian as Google gave it', () => {
    expect(
      areaBounds(
        { bounds: box(-12.4, -21.0, -178.2, 176.8) },
        {
          latitude: -17.7,
          longitude: 178.0,
        },
      ),
    ).toEqual({ north: -12.4, south: -21.0, east: -178.2, west: 176.8 });
  });
});

describe('hasOutline', () => {
  it('is true only for a place Google drew a real outline around', () => {
    expect(hasOutline({ bounds: box(41.2, 40.8, 29.3, 28.8) })).toBe(true);
    expect(hasOutline({ viewport: box(41.1, 40.9, 29.2, 28.9) })).toBe(false);
    expect(hasOutline()).toBe(false);
  });
});

const part = (long_name: string, short_name: string, ...types: string[]) => ({
  long_name,
  short_name,
  types: [...types, 'political'],
});

const TURKEY = part('Türkiye', 'TR', 'country');
const ISTANBUL = part('İstanbul', 'İstanbul', 'administrative_area_level_1');
const KOCAELI = part('Kocaeli', 'Kocaeli', 'administrative_area_level_1');

const USA = part('United States', 'US', 'country');
const TEXAS = part('Texas', 'TX', 'administrative_area_level_1');
const AUSTIN = part('Austin', 'Austin', 'locality');

describe('areaCountryCode', () => {
  it('reads the ISO code of the country component', () => {
    expect(areaCountryCode([ISTANBUL, TURKEY])).toBe('TR');
  });

  it('is null when Google named no country', () => {
    expect(areaCountryCode([ISTANBUL])).toBeNull();
    expect(areaCountryCode()).toBeNull();
  });
});

describe('areaCity', () => {
  it('belongs a country to no city', () => {
    expect(areaCity('country', 'Türkiye', [TURKEY])).toBeNull();
  });

  describe('in Turkey, where the province is the city', () => {
    it('puts a district in its province', () => {
      expect(
        areaCity('district', 'Kadıköy', [
          part('Kadıköy', 'Kadıköy', 'administrative_area_level_2'),
          ISTANBUL,
          TURKEY,
        ]),
      ).toBe('İstanbul');
    });

    it('puts a town Google calls a locality in its province too', () => {
      expect(
        areaCity('city', 'Gebze', [
          part('Gebze', 'Gebze', 'locality'),
          KOCAELI,
          TURKEY,
        ]),
      ).toBe('Kocaeli');
    });

    it('makes the province its own city', () => {
      expect(areaCity('region', 'İstanbul', [ISTANBUL, TURKEY])).toBe(
        'İstanbul',
      );
    });

    it('puts a restaurant in the province it is in', () => {
      expect(
        areaCity('place', 'Çiya Sofrası', [
          part('Caferağa', 'Caferağa', 'administrative_area_level_4'),
          part('Kadıköy', 'Kadıköy', 'administrative_area_level_2'),
          ISTANBUL,
          TURKEY,
        ]),
      ).toBe('İstanbul');
    });
  });

  describe('elsewhere, where the locality is the city', () => {
    it('makes a locality its own city', () => {
      expect(areaCity('city', 'Austin', [AUSTIN, TEXAS, USA])).toBe('Austin');
    });

    it('puts a place in its locality, not its state', () => {
      expect(areaCity('place', 'Zilker Park', [AUSTIN, TEXAS, USA])).toBe(
        'Austin',
      );
    });

    it('uses the postal town where Britain has no locality', () => {
      expect(
        areaCity('district', 'Clifton', [
          part('Bristol', 'Bristol', 'postal_town'),
          part('England', 'England', 'administrative_area_level_1'),
          part('United Kingdom', 'GB', 'country'),
        ]),
      ).toBe('Bristol');
    });

    it('puts a place in no town at all in no city, rather than its state', () => {
      expect(
        areaCity('place', 'Ranch', [
          part('Travis County', 'Travis County', 'administrative_area_level_2'),
          TEXAS,
          USA,
        ]),
      ).toBeNull();
    });

    it('treats a state like a country: wider than any city', () => {
      expect(areaCity('region', 'Texas', [TEXAS, USA])).toBeNull();
    });
  });

  it('falls back to the area’s own name when Google listed no parts', () => {
    expect(areaCity('city', 'Somewhere', [])).toBe('Somewhere');
    expect(areaCity('place', 'A café', [])).toBeNull();
  });
});
