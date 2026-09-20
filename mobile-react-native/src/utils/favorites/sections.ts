import { FAVORITE_SECTION_KEYS } from 'store/adapters/favoriteAdapter';
import {
  FavoriteEntry,
  FavoriteKind,
  FavoriteSectionKey,
  NormalizedFavorites,
} from 'types/store/services/favoriteService-type';
import {
  FavoriteSectionDescriptor,
  MaterialIconName,
} from 'types/screens/mapScreenType';

const LABELS: Record<
  FavoriteSectionKey,
  { title: string; icon: MaterialIconName; kind: FavoriteKind }
> = {
  ownRoutes: {
    title: 'favorites.ownRoutes',
    icon: 'directions-car',
    kind: 'route',
  },
  ownStops: { title: 'favorites.ownStops', icon: 'location-on', kind: 'stop' },
  othersRoutes: {
    title: 'favorites.othersRoutes',
    icon: 'public',
    kind: 'route',
  },
  othersStops: {
    title: 'favorites.othersStops',
    icon: 'place',
    kind: 'stop',
  },
};

export const sectionKeysFor = (kind: FavoriteKind): FavoriteSectionKey[] =>
  FAVORITE_SECTION_KEYS.filter((key) => LABELS[key].kind === kind);

export const buildSections = (
  favorites: NormalizedFavorites,
  isExpanded: (key: FavoriteSectionKey) => boolean,
  kind: FavoriteKind,
): FavoriteSectionDescriptor[] => {
  const sections: FavoriteSectionDescriptor[] = [];

  for (const key of sectionKeysFor(kind)) {
    const entries: FavoriteEntry[] = favorites[key];
    if (entries.length === 0) continue;

    sections.push({
      key,
      ...LABELS[key],
      count: entries.length,
      data: isExpanded(key) ? entries : [],
    });
  }

  return sections;
};
