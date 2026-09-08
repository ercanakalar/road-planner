import { FAVORITE_SECTION_KEYS } from 'store/adapters/favoriteAdapter';
import {
  FavoriteEntry,
  FavoriteSectionKey,
  NormalizedFavorites,
} from 'types/store/services/favoriteService-type';
import {
  FavoriteSectionDescriptor,
  MaterialIconName,
} from 'types/screens/mapScreenType';

const LABELS: Record<
  FavoriteSectionKey,
  { title: string; icon: MaterialIconName }
> = {
  ownRoads: { title: 'My routes', icon: 'directions-car' },
  ownWaypoints: { title: 'My places', icon: 'location-on' },
  othersRoads: { title: "Others' routes", icon: 'public' },
  othersWaypoints: { title: "Others' places", icon: 'place' },
};

/**
 * Turns the four buckets into the sections the list draws.
 *
 * A section with nothing in it is left out rather than shown as a header with
 * a zero beside it — four rows of chrome saying "nothing here" is worse than
 * saying nothing. A collapsed section keeps its header, and that header still
 * reports how many it holds, so collapsing does not look like emptying.
 */
export const buildSections = (
  favorites: NormalizedFavorites,
  isExpanded: (key: FavoriteSectionKey) => boolean,
): FavoriteSectionDescriptor[] => {
  const sections: FavoriteSectionDescriptor[] = [];

  for (const key of FAVORITE_SECTION_KEYS) {
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
