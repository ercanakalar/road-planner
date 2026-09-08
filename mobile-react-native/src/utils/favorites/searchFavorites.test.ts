import { countFavorites, searchFavorites } from './searchFavorites';
import {
  FavoriteEntry,
  NormalizedFavorites,
} from 'types/store/services/favoriteService-type';

const entry = (partial: Partial<FavoriteEntry>): FavoriteEntry => ({
  favoriteId: 'f1',
  targetId: 't1',
  kind: 'road',
  title: 'Coast run',
  defaultTitle: 'Coast run',
  isOwn: true,
  ...partial,
});

const favorites: NormalizedFavorites = {
  ownRoads: [
    entry({ favoriteId: 'r1', title: 'Sunday drive', defaultTitle: 'Coast run' }),
    entry({
      favoriteId: 'r2',
      title: 'Airport run',
      defaultTitle: 'Airport run',
    }),
  ],
  ownStops: [
    entry({
      favoriteId: 'w1',
      kind: 'stop',
      title: 'Sultanahmet Sq',
      subtitle: 'Fatih, İstanbul',
      defaultTitle: 'Sultanahmet Sq',
      address: 'Sultanahmet Sq, Fatih, İstanbul, Türkiye',
    }),
  ],
  othersRoads: [],
  othersStops: [entry({ favoriteId: 'w2', kind: 'stop', title: 'Kadıköy' })],
};

describe('searchFavorites', () => {
  it('returns everything for an empty query', () => {
    expect(searchFavorites(favorites, '')).toBe(favorites);
    expect(searchFavorites(favorites, '   ')).toBe(favorites);
  });

  it('matches on the title, ignoring case', () => {
    const found = searchFavorites(favorites, 'AIRPORT');

    expect(found.ownRoads.map((row) => row.favoriteId)).toEqual(['r2']);
  });

  it('matches on the name the entry came with, not only the label', () => {
    // Someone who renamed "Coast run" to "Sunday drive" may search for either.
    expect(searchFavorites(favorites, 'coast').ownRoads).toHaveLength(1);
  });

  it('matches on where a place is', () => {
    expect(searchFavorites(favorites, 'fatih').ownStops).toHaveLength(1);
  });

  it('needs every word, in any order', () => {
    expect(searchFavorites(favorites, 'sunday coast').ownRoads).toHaveLength(1);
    expect(searchFavorites(favorites, 'sunday airport').ownRoads).toHaveLength(0);
  });

  it('finds a Turkish name typed on an English keyboard', () => {
    // An English keyboard types neither the dotless ı nor the ö.
    expect(searchFavorites(favorites, 'kadikoy').othersStops).toHaveLength(1);
    expect(searchFavorites(favorites, 'İSTANBUL').ownStops).toHaveLength(1);
  });

  it('searches every section, not just the first', () => {
    const found = searchFavorites(favorites, 'sq');

    expect(countFavorites(found)).toBe(1);
    expect(found.ownStops[0].favoriteId).toBe('w1');
  });

  it('gives back empty sections when nothing matches', () => {
    expect(countFavorites(searchFavorites(favorites, 'zzz'))).toBe(0);
  });
});

describe('countFavorites', () => {
  it('adds up all four sections', () => {
    expect(countFavorites(favorites)).toBe(4);
  });
});
