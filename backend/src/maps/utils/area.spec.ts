import { areaBounds, areaKind, hasOutline } from './area';

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
    // A country is also `political`, and a village is half a dozen of these at
    // once — the widest match is the one that describes the whole thing.
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
    // Fiji's east edge is a smaller number than its west one. Reordering them
    // here would draw the box the long way round, across the whole world.
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
