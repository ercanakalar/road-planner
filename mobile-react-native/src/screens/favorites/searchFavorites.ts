import { foldForSearch } from 'utils/text';
import { FAVORITE_SECTION_KEYS } from 'store/adapters/favoriteAdapter';
import {
  FavoriteEntry,
  NormalizedFavorites,
} from 'types/store/services/favoriteService-type';

/**
 * Everything about an entry a person might type to find it again: the label
 * they gave it, the name it came with, and where it is.
 */
const haystack = (entry: FavoriteEntry): string =>
  foldForSearch(
    [entry.title, entry.subtitle, entry.defaultTitle, entry.address]
      .filter(Boolean)
      .join(' '),
  );

/**
 * Narrows the favourites to those matching what was typed.
 *
 * Every word has to appear somewhere in the entry, in any order — "coast
 * sunday" finds "Sunday drive" saved from "Coast run". Folding both sides
 * means "kadikoy" finds "Kadıköy", which an English keyboard otherwise could
 * not type.
 */
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

/** How many favourites are in all four sections together. */
export const countFavorites = (favorites: NormalizedFavorites): number =>
  FAVORITE_SECTION_KEYS.reduce((total, key) => total + favorites[key].length, 0);
