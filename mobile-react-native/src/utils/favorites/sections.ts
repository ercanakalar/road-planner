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
  ownRoutes: { title: 'My routes', icon: 'directions-car', kind: 'route' },
  ownStops: { title: 'My places', icon: 'location-on', kind: 'stop' },
  othersRoutes: { title: "Others' routes", icon: 'public', kind: 'route' },
  othersStops: { title: "Others' places", icon: 'place', kind: 'stop' },
};

/** Which of the four buckets belong to each tab. */
export const sectionKeysFor = (kind: FavoriteKind): FavoriteSectionKey[] =>
  FAVORITE_SECTION_KEYS.filter((key) => LABELS[key].kind === kind);

/**
 * Turns the four buckets into the sections the list draws.
 *
 * A section with nothing in it is left out rather than shown as a header with
 * a zero beside it — four rows of chrome saying "nothing here" is worse than
 * saying nothing. A collapsed section keeps its header, and that header still
 * reports how many it holds, so collapsing does not look like emptying.
 *
 * `kind` is the tab being shown. Yours and other people's stay separate
 * sections inside it: a route you saved from somebody else can be withdrawn
 * by them, and the two are not interchangeable just because they are both
 * routes.
 */
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
