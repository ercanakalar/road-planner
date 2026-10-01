import { AreaBounds, MapArea, MarkedArea } from 'types/travel-map';

// How many city colours the map has. Any two shaded regions on a map can end
// up side by side, and four is the largest set of the documented chart hues
// in which every pair stays easy to tell apart (see constants/travelMap). Four
// is also enough: a city takes a colour none of its neighbours wears, the way
// a political map is coloured, so neighbouring cities never share one.
export const CITY_COLOR_COUNT = 4;

// Two cities nearer than this are neighbours. Generous on purpose: what gets
// marked is often a single district, far smaller than its city, so the boxes
// of two cities that touch need not overlap yet.
const NEIGHBOUR_MARGIN_DEGREES = 0.5;

const FULL_TURN = 360;

export interface CityRef {
  key: string;
  name: string;
}

export interface CityGroup {
  key: string;
  name: string;
  colorSlot: number | null;
  areas: MarkedArea[];
  bounds: AreaBounds;
  firstMarkedAt: string;
  lastMarkedAt: string;
}

export interface CityGrouping {
  cities: CityGroup[];
  elsewhere: MarkedArea[];
}

// One spelling per city, whatever Google sent: "İstanbul", "Istanbul" and
// "istanbul" are the same place.
const normalise = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .trim();

const COUNTRY_SEPARATOR = '@';

const keyOf = (name: string, countryCode?: string | null): string =>
  countryCode
    ? `${normalise(name)}${COUNTRY_SEPARATOR}${countryCode.toUpperCase()}`
    : normalise(name);

const bareKey = (key: string): string => key.split(COUNTRY_SEPARATOR)[0];

const hasCountry = (key: string): boolean => key.includes(COUNTRY_SEPARATOR);

const unwrap = (bounds: AreaBounds): AreaBounds =>
  bounds.east < bounds.west
    ? { ...bounds, east: bounds.east + FULL_TURN }
    : bounds;

const boxSize = (bounds: AreaBounds): number => {
  const { north, south, east, west } = unwrap(bounds);
  return (north - south) * (east - west);
};

const contains = (
  bounds: AreaBounds,
  { latitude, longitude }: { latitude: number; longitude: number },
): boolean => {
  const box = unwrap(bounds);
  if (latitude < box.south || latitude > box.north) return false;

  return [-FULL_TURN, 0, FULL_TURN].some(
    (shift) =>
      longitude + shift >= box.west && longitude + shift <= box.east,
  );
};

export const areNeighbours = (
  one: AreaBounds,
  other: AreaBounds,
  margin: number = NEIGHBOUR_MARGIN_DEGREES,
): boolean => {
  const a = unwrap(one);
  const b = unwrap(other);

  if (a.north + margin < b.south || b.north + margin < a.south) return false;

  return [-FULL_TURN, 0, FULL_TURN].some(
    (shift) =>
      a.west - margin <= b.east + shift && b.west + shift <= a.east + margin,
  );
};

const union = (one: AreaBounds, other: AreaBounds): AreaBounds => ({
  north: Math.max(one.north, other.north),
  south: Math.min(one.south, other.south),
  east: Math.max(one.east, other.east),
  west: Math.min(one.west, other.west),
});

// The city an area itself names — without looking around it.
const ownCity = (area: MapArea): CityRef | null | undefined => {
  if (area.kind === 'country') return null;

  if (typeof area.city === 'string') {
    const name = area.city.trim();
    return name ? { key: keyOf(name, area.countryCode), name } : null;
  }

  // The server answered, and the answer was: in no city.
  if (area.city === null) return null;

  // Saved before areas carried their city. A city or a province is its own.
  if (area.kind === 'city' || area.kind === 'region') {
    return { key: keyOf(area.name), name: area.name };
  }

  return undefined;
};

// Which city an area belongs to: the one it names, or — for a district or a
// place saved before areas carried their city — the smallest marked area
// around it that names one. Null when it belongs to no city.
export const cityOf = (
  area: MapArea,
  others: readonly MapArea[] = [],
): CityRef | null => {
  const own = ownCity(area);
  if (own !== undefined) return own;

  const enclosing = others
    .filter(
      (other) =>
        other.placeId !== area.placeId &&
        other.kind !== 'country' &&
        contains(other.bounds, area),
    )
    .sort((one, other) => boxSize(one.bounds) - boxSize(other.bounds));

  for (const candidate of enclosing) {
    const ref = ownCity(candidate);
    if (ref) return ref;
  }

  return null;
};

export const groupByCity = (areas: readonly MarkedArea[]): CityGrouping => {
  const refs = areas.map((area) => cityOf(area, areas));

  // A city saved before areas carried a country joins the same city that
  // came with one, as long as the name is not shared by two countries.
  const countriesByName = new Map<string, Set<string>>();
  for (const ref of refs) {
    if (!ref || !hasCountry(ref.key)) continue;
    const keys = countriesByName.get(bareKey(ref.key)) ?? new Set<string>();
    keys.add(ref.key);
    countriesByName.set(bareKey(ref.key), keys);
  }

  const canonical = (ref: CityRef): string => {
    if (hasCountry(ref.key)) return ref.key;
    const keys = countriesByName.get(ref.key);
    return keys?.size === 1 ? [...keys][0] : ref.key;
  };

  const groups = new Map<string, CityGroup>();
  // Groups whose name is the server's spelling rather than one inferred from
  // an old area's own name; the server's wins when both are seen.
  const namedByServer = new Set<string>();
  const elsewhere: MarkedArea[] = [];

  areas.forEach((area, index) => {
    const ref = refs[index];

    if (!ref) {
      elsewhere.push(area);
      return;
    }

    const key = canonical(ref);
    const group = groups.get(key);

    if (!group) {
      groups.set(key, {
        key,
        name: ref.name,
        colorSlot: area.colorSlot ?? null,
        areas: [area],
        bounds: area.bounds,
        firstMarkedAt: area.markedAt,
        lastMarkedAt: area.markedAt,
      });
      if (hasCountry(ref.key)) namedByServer.add(key);
      return;
    }

    group.areas.push(area);
    group.bounds = union(group.bounds, area.bounds);

    if (group.colorSlot === null && area.colorSlot !== undefined) {
      group.colorSlot = area.colorSlot;
    }
    if (hasCountry(ref.key) && !namedByServer.has(key)) {
      group.name = ref.name;
      namedByServer.add(key);
    }
    if (area.markedAt < group.firstMarkedAt) {
      group.firstMarkedAt = area.markedAt;
    }
    if (area.markedAt > group.lastMarkedAt) {
      group.lastMarkedAt = area.markedAt;
    }
  });

  const cities = [...groups.values()].sort(
    (one, other) =>
      other.lastMarkedAt.localeCompare(one.lastMarkedAt) ||
      one.name.localeCompare(other.name),
  );

  return { cities, elsewhere };
};

interface Coloured {
  bounds: AreaBounds;
  colorSlot: number | null;
}

// The colour for a city entering the map: one none of its neighbours wears,
// and among those the one used least so far — so the first cities each get
// their own and later ones spread evenly. If every colour is already next
// door, which four make rare, the one used least nearby.
export const pickColorSlot = (
  bounds: AreaBounds,
  cities: readonly Coloured[],
): number => {
  const nearby = new Array<number>(CITY_COLOR_COUNT).fill(0);
  const overall = new Array<number>(CITY_COLOR_COUNT).fill(0);

  for (const city of cities) {
    if (city.colorSlot === null || city.colorSlot >= CITY_COLOR_COUNT) continue;
    overall[city.colorSlot] += 1;
    if (areNeighbours(bounds, city.bounds)) nearby[city.colorSlot] += 1;
  }

  const slots = Array.from({ length: CITY_COLOR_COUNT }, (_, slot) => slot);
  const free = slots.filter((slot) => nearby[slot] === 0);
  const pool = free.length ? free : slots;

  return pool.reduce((best, slot) => {
    const byNearby = nearby[slot] - nearby[best];
    if (byNearby !== 0) return byNearby < 0 ? slot : best;
    return overall[slot] < overall[best] ? slot : best;
  });
};

// Gives every city on the map a colour, keeping the ones cities already have:
// a city never changes colour because another arrived or left. Cities still
// without one — new, or saved before colours were kept — are coloured oldest
// first, so the result is the same every time for the same map.
export const withColorSlots = (
  areas: readonly MarkedArea[],
): MarkedArea[] => {
  const { cities } = groupByCity(areas);

  const coloured: Coloured[] = cities
    .filter((city) => city.colorSlot !== null)
    .map(({ bounds, colorSlot }) => ({ bounds, colorSlot }));

  const slotOf = new Map<string, number>();

  for (const city of cities) {
    if (city.colorSlot !== null) slotOf.set(city.key, city.colorSlot);
  }

  const uncoloured = cities
    .filter((city) => city.colorSlot === null)
    .sort((one, other) => one.firstMarkedAt.localeCompare(other.firstMarkedAt));

  for (const city of uncoloured) {
    const slot = pickColorSlot(city.bounds, coloured);
    coloured.push({ bounds: city.bounds, colorSlot: slot });
    slotOf.set(city.key, slot);
  }

  const cityOfArea = new Map<string, string>();
  for (const city of cities) {
    for (const area of city.areas) cityOfArea.set(area.placeId, city.key);
  }

  return areas.map((area) => {
    const key = cityOfArea.get(area.placeId);
    const slot = key === undefined ? undefined : slotOf.get(key);

    if (slot === area.colorSlot) return area;
    if (slot === undefined) {
      const { colorSlot: _dropped, ...rest } = area;
      return rest;
    }
    return { ...area, colorSlot: slot };
  });
};

// Sorts after every real timestamp, so a previewed area counts as the newest.
const NOT_YET_MARKED = '\uffff';

// The colour an area wears on the map, or would wear if it were marked now.
export const previewColorSlot = (
  area: MapArea,
  marked: readonly MarkedArea[],
): number | null => {
  const existing = marked.find((other) => other.placeId === area.placeId);
  if (existing) return existing.colorSlot ?? null;

  const [placed] = withColorSlots([
    { ...area, markedAt: NOT_YET_MARKED },
    ...marked,
  ]);

  return placed.colorSlot ?? null;
};
