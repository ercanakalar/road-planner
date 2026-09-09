import { buildSections, sectionKeysFor } from './sections';
import {
  FavoriteEntry,
  FavoriteSectionKey,
  NormalizedFavorites,
} from 'types/store/services/favoriteService-type';

const entry = (id: string): FavoriteEntry => ({
  favoriteId: id,
  targetId: id,
  kind: 'route',
  title: id,
  defaultTitle: id,
  isOwn: true,
});

const favorites: NormalizedFavorites = {
  ownRoutes: [entry('r1'), entry('r2')],
  ownStops: [entry('w1')],
  othersRoutes: [],
  othersStops: [],
};

const allExpanded = () => true;
const allCollapsed = () => false;

describe('sectionKeysFor', () => {
  it('puts yours and other people’s behind the same tab', () => {
    expect(sectionKeysFor('route')).toEqual(['ownRoutes', 'othersRoutes']);
    expect(sectionKeysFor('stop')).toEqual(['ownStops', 'othersStops']);
  });
});

describe('buildSections', () => {
  it('leaves out a section with nothing in it', () => {
    // Two headers, one of them reading "0", is chrome standing in for content.
    expect(buildSections(favorites, allExpanded, 'route').map((s) => s.key)).toEqual(
      ['ownRoutes'],
    );
  });

  it('shows only the tab it was asked for', () => {
    const mine: NormalizedFavorites = {
      ownRoutes: [entry('r1')],
      ownStops: [entry('w1')],
      othersRoutes: [entry('r2')],
      othersStops: [entry('w2')],
    };

    expect(buildSections(mine, allExpanded, 'route').map((s) => s.key)).toEqual([
      'ownRoutes',
      'othersRoutes',
    ]);
    expect(buildSections(mine, allExpanded, 'stop').map((s) => s.key)).toEqual([
      'ownStops',
      'othersStops',
    ]);
  });

  it('keeps yours above other people’s', () => {
    const mine: NormalizedFavorites = {
      ownRoutes: [entry('r1')],
      ownStops: [],
      othersRoutes: [entry('r2')],
      othersStops: [],
    };

    expect(buildSections(mine, allExpanded, 'route').map((s) => s.key)).toEqual([
      'ownRoutes',
      'othersRoutes',
    ]);
  });

  it('gives the list the rows of an expanded section', () => {
    expect(buildSections(favorites, allExpanded, 'route')[0].data).toHaveLength(
      2,
    );
  });

  it('draws no rows for a collapsed section but still counts them', () => {
    // The badge is how you know what you collapsed, so it reports the real
    // size rather than the zero rows currently drawn.
    const [routes] = buildSections(favorites, allCollapsed, 'route');

    expect(routes.data).toEqual([]);
    expect(routes.count).toBe(2);
  });

  it('collapses one section without touching the next', () => {
    const mine: NormalizedFavorites = {
      ownRoutes: [entry('r1')],
      ownStops: [],
      othersRoutes: [entry('r2')],
      othersStops: [],
    };
    const isExpanded = (key: FavoriteSectionKey) => key !== 'ownRoutes';
    const [own, others] = buildSections(mine, isExpanded, 'route');

    expect(own.data).toEqual([]);
    expect(others.data).toHaveLength(1);
  });

  it('names each section and gives it an icon', () => {
    const [routes] = buildSections(favorites, allExpanded, 'route');

    expect(routes.title).toBe('My routes');
    expect(routes.icon).toBe('directions-car');
  });

  it('returns nothing at all when this tab has no favourites', () => {
    expect(
      buildSections(
        { ownRoutes: [], ownStops: [], othersRoutes: [], othersStops: [] },
        allExpanded,
        'route',
      ),
    ).toEqual([]);
  });
});
