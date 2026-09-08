import {
  isGoogleMapsLink,
  isShortGoogleMapsLink,
  parseGoogleMapsRoute,
  parseStop,
} from './googleMapsRoute';

const stopsOf = (url: string) => parseGoogleMapsRoute(url)?.stops;

describe('parseStop', () => {
  it('reads a coordinate pair as a point', () => {
    expect(parseStop('41.0082,28.9784')).toEqual({
      latitude: 41.0082,
      longitude: 28.9784,
    });
  });

  it('reads a negative pair', () => {
    expect(parseStop('-33.8688,151.2093')).toEqual({
      latitude: -33.8688,
      longitude: 151.2093,
    });
  });

  it('keeps anything else as words for the geocoder', () => {
    expect(parseStop('Kadıköy,+İstanbul')).toEqual({
      query: 'Kadıköy, İstanbul',
    });
  });

  it('decodes what the URL escaped', () => {
    expect(parseStop('Taksim%20Square')).toEqual({ query: 'Taksim Square' });
  });

  it('survives a stray percent that is not an escape', () => {
    // Losing the whole stop over one bad character would be worse than
    // handing the geocoder the literal text.
    expect(parseStop('50%+off+diner')).toEqual({ query: '50% off diner' });
  });

  it('rejects a pair that is off the globe', () => {
    // 'Route 91,200' is a name, not a latitude.
    expect(parseStop('91,200')).toEqual({ query: '91,200' });
  });

  it('ignores an empty segment', () => {
    expect(parseStop('   ')).toBeNull();
  });
});

describe('parseGoogleMapsRoute — the documented ?api=1 form', () => {
  it('reads origin, waypoints and destination in travelling order', () => {
    expect(
      stopsOf(
        'https://www.google.com/maps/dir/?api=1&origin=Kadikoy&destination=Sariyer&waypoints=Uskudar%7CBesiktas',
      ),
    ).toEqual([
      { query: 'Kadikoy' },
      { query: 'Uskudar' },
      { query: 'Besiktas' },
      { query: 'Sariyer' },
    ]);
  });

  it('carries the travel mode across', () => {
    expect(
      parseGoogleMapsRoute(
        'https://www.google.com/maps/dir/?api=1&origin=A&destination=B&travelmode=walking',
      )?.mode,
    ).toBe('walking');
  });

  it('lands cycling on driving, the closest of the three modes here', () => {
    expect(
      parseGoogleMapsRoute(
        'https://www.google.com/maps/dir/?api=1&origin=A&destination=B&travelmode=bicycling',
      )?.mode,
    ).toBe('driving');
  });

  it('attaches place ids to the stops they belong to', () => {
    const stops = stopsOf(
      'https://www.google.com/maps/dir/?api=1&origin=A&destination=C&waypoints=B' +
        '&origin_place_id=p1&waypoint_place_ids=p2&destination_place_id=p3',
    );

    expect(stops?.map((stop) => stop.placeId)).toEqual(['p1', 'p2', 'p3']);
  });

  it('mixes coordinates and names in one route', () => {
    expect(
      stopsOf(
        'https://www.google.com/maps/dir/?api=1&origin=41.0082,28.9784&destination=Sariyer',
      ),
    ).toEqual([
      { latitude: 41.0082, longitude: 28.9784 },
      { query: 'Sariyer' },
    ]);
  });
});

describe('parseGoogleMapsRoute — the /maps/dir/ path form', () => {
  it('reads the stops out of the path', () => {
    expect(
      stopsOf('https://www.google.com/maps/dir/Kadikoy/Uskudar/Besiktas'),
    ).toEqual([
      { query: 'Kadikoy' },
      { query: 'Uskudar' },
      { query: 'Besiktas' },
    ]);
  });

  it('drops the viewport and the data blob, which are not stops', () => {
    expect(
      stopsOf(
        'https://www.google.com/maps/dir/Kadikoy/Uskudar/@41.0214,29.0049,13z/data=!4m2!4m1!3e0',
      ),
    ).toEqual([{ query: 'Kadikoy' }, { query: 'Uskudar' }]);
  });

  it('reads coordinates written into the path', () => {
    expect(
      stopsOf('https://www.google.com/maps/dir/41.0082,28.9784/40.9923,29.0244'),
    ).toEqual([
      { latitude: 41.0082, longitude: 28.9784 },
      { latitude: 40.9923, longitude: 29.0244 },
    ]);
  });

  it('works on a country domain', () => {
    expect(stopsOf('https://www.google.com.tr/maps/dir/A/B')).toHaveLength(2);
  });
});

describe('parseGoogleMapsRoute — older links', () => {
  it('reads saddr and a chain of daddr stops', () => {
    expect(
      stopsOf(
        'https://maps.google.com/maps?saddr=Kadikoy&daddr=Uskudar+to:Besiktas',
      ),
    ).toEqual([
      { query: 'Kadikoy' },
      { query: 'Uskudar' },
      { query: 'Besiktas' },
    ]);
  });

  it('reads the single-letter mode those links use', () => {
    expect(
      parseGoogleMapsRoute(
        'https://maps.google.com/maps?saddr=A&daddr=B&dirflg=w',
      )?.mode,
    ).toBe('walking');
  });
});

describe('parseGoogleMapsRoute — a shared place', () => {
  it('takes a single pin as a one-stop route', () => {
    expect(
      stopsOf('https://www.google.com/maps/search/?api=1&query=Galata+Tower'),
    ).toEqual([{ query: 'Galata Tower' }]);
  });

  it('reads a /maps/place/ link', () => {
    expect(
      stopsOf('https://www.google.com/maps/place/Galata+Tower/@41.02,28.97,17z'),
    ).toEqual([{ query: 'Galata Tower' }]);
  });
});

describe('parseGoogleMapsRoute — what it refuses', () => {
  it.each([
    ['plain words', 'Kadikoy to Uskudar'],
    ['a non-Google link', 'https://example.com/maps/dir/A/B'],
    ['a Google link with no route in it', 'https://www.google.com/maps'],
    ['an empty string', ''],
    ['nonsense', 'not a url at all'],
  ])('returns null for %s', (_label, input) => {
    expect(parseGoogleMapsRoute(input)).toBeNull();
  });

  it('returns null for a short link, which says nothing until it is followed', () => {
    expect(parseGoogleMapsRoute('https://maps.app.goo.gl/abc123')).toBeNull();
  });
});

describe('link recognition', () => {
  it.each([
    ['https://maps.app.goo.gl/abc123', true],
    ['https://goo.gl/maps/abc123', true],
    ['https://www.google.com/maps/dir/A/B', false],
    ['https://example.com/x', false],
  ])('%s is a short link: %s', (url, expected) => {
    expect(isShortGoogleMapsLink(url)).toBe(expected);
  });

  it.each([
    ['https://www.google.com/maps/dir/A/B', true],
    ['https://google.co.uk/maps/dir/A/B', true],
    ['https://maps.google.com/maps?saddr=A', true],
    ['https://maps.app.goo.gl/abc', true],
    ['https://notgoogle.com/maps', false],
    ['https://google.com.evil.example/maps', false],
  ])('%s is a Google Maps link: %s', (url, expected) => {
    expect(isGoogleMapsLink(url)).toBe(expected);
  });
});
