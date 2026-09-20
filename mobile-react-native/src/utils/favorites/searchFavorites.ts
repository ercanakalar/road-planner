import { foldForSearch } from 'utils/text';
import { FAVORITE_SECTION_KEYS } from 'store/adapters/favoriteAdapter';
import { sectionKeysFor } from 'utils/favorites/sections';
import {
  FavoriteEntry,
  FavoriteKind,
  NormalizedFavorites,
} from 'types/store/services/favoriteService-type';

const haystack = (entry: FavoriteEntry): string =>
  foldForSearch(
    [entry.title, entry.subtitle, entry.defaultTitle, entry.address]
      .filter(Boolean)
      .join(' '),
  );

export const searchFavorites = (
  favorites: NormalizedFavorites,
  query: string,
): NormalizedFavorites => {
  const words = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return favorites;

  const result = {} as NormalizedFavorites;

  for (const key of FAVORITE_SECTION_KEYS) {
    result[key] = favorites[key].filter((entry) => {
      const text = haystack(entry);
      return words.every((word) => text.includes(word));
    });
  }

  return result;
};

export const countFavorites = (
  favorites: NormalizedFavorites,
  kind?: FavoriteKind,
): number =>
  (kind ? sectionKeysFor(kind) : FAVORITE_SECTION_KEYS).reduce(
    (total, key) => total + favorites[key].length,
    0,
  );
