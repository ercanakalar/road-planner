import { buildSections } from './sections';
import {
  FavoriteEntry,
  FavoriteSectionKey,
  NormalizedFavorites,
} from 'types/store/services/favoriteService-type';

const entry = (id: string): FavoriteEntry => ({
  favoriteId: id,
  targetId: id,
  kind: 'road',
  title: id,
  defaultTitle: id,
  isOwn: true,
});

const favorites: NormalizedFavorites = {
  ownRoads: [entry('r1'), entry('r2')],
  ownWaypoints: [entry('w1')],
  othersRoads: [],
  othersWaypoints: [],
};

const allExpanded = () => true;
const allCollapsed = () => false;

describe('buildSections', () => {
  it('leaves out a section with nothing in it', () => {
    // Four headers, two of them reading "0", is chrome standing in for content.
    expect(buildSections(favorites, allExpanded).map((s) => s.key)).toEqual([
      'ownRoads',
      'ownWaypoints',
    ]);
  });

  it('keeps the order the buckets are meant to read in', () => {
    const mine: NormalizedFavorites = {
      ownRoads: [entry('r1')],
      ownWaypoints: [entry('w1')],
      othersRoads: [entry('r2')],
      othersWaypoints: [entry('w2')],
    };

    expect(buildSections(mine, allExpanded).map((s) => s.key)).toEqual([
      'ownRoads',
      'ownWaypoints',
      'othersRoads',
      'othersWaypoints',
    ]);
  });

  it('gives the list the rows of an expanded section', () => {
    expect(buildSections(favorites, allExpanded)[0].data).toHaveLength(2);
  });

  it('draws no rows for a collapsed section but still counts them', () => {
    // The badge is how you know what you collapsed, so it reports the real
    // size rather than the zero rows currently drawn.
    const [roads] = buildSections(favorites, allCollapsed);

    expect(roads.data).toEqual([]);
    expect(roads.count).toBe(2);
  });

  it('collapses one section without touching the next', () => {
    const isExpanded = (key: FavoriteSectionKey) => key !== 'ownRoads';
    const [roads, places] = buildSections(favorites, isExpanded);

    expect(roads.data).toEqual([]);
    expect(places.data).toHaveLength(1);
  });

  it('names each section and gives it an icon', () => {
    const [roads] = buildSections(favorites, allExpanded);

    expect(roads.title).toBe('My routes');
    expect(roads.icon).toBe('directions-car');
  });

  it('returns nothing at all when no favourites are saved', () => {
    expect(
      buildSections(
        { ownRoads: [], ownWaypoints: [], othersRoads: [], othersWaypoints: [] },
        allExpanded,
      ),
    ).toEqual([]);
  });
});
