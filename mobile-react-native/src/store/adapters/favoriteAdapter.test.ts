import {
  EMPTY_FAVORITES,
  normalizeFavorites,
  removeFromFavorites,
} from './favoriteAdapter';
import { RawFavorites } from 'types/store/services/favoriteService-type';

/*
 * Fixture mirrors the select in `backend/src/favorites/favorites.service.ts`
 * (`getAllFavorites`): a favourite row carries its own id, and the road or
 * waypoint it points at is nested underneath.
 */
const raw = {
  ownRoads: [
    {
      id: 'fav-road-1',
      title: null,
      description: null,
      road: {
        id: 'road-42',
        title: 'Coast run',
        description: 'Weekend loop',
        userId: 'u1',
      },
    },
  ],
  ownWaypoints: [
    {
      id: 'fav-wp-1',
      title: null,
      description: null,
      waypoint: {
        id: 'wp-7',
        latitude: 41.0082,
        longitude: 28.9784,
        address: {
          country: 'Türkiye',
          province: 'İstanbul',
          district: 'Fatih',
          address: 'Sultanahmet Sq',
        },
      },
    },
  ],
  othersRoads: [],
  othersWaypoints: [
    {
      id: 'fav-wp-2',
      title: null,
      description: null,
      waypoint: {
        id: 'wp-9',
        latitude: 39.9334,
        longitude: 32.8597,
        address: null,
      },
    },
  ],
} satisfies RawFavorites;

describe('normalizeFavorites', () => {
  it('points targetId at the road, not the favourite row', () => {
    expect(normalizeFavorites(raw).ownRoads[0]).toEqual({
      favoriteId: 'fav-road-1',
      targetId: 'road-42',
      kind: 'road',
      title: 'Coast run',
      subtitle: 'Weekend loop',
    });
  });

  it('points targetId at the waypoint and titles it from the address', () => {
    expect(normalizeFavorites(raw).ownWaypoints[0]).toEqual({
      favoriteId: 'fav-wp-1',
      targetId: 'wp-7',
      kind: 'waypoint',
      title: 'Sultanahmet Sq',
      subtitle: 'Fatih, İstanbul',
    });
  });

  it('falls back to coordinates when the address join is missing', () => {
    expect(normalizeFavorites(raw).othersWaypoints[0].subtitle).toBe(
      '39.9334, 32.8597',
    );
  });

  it('returns empty sections rather than throwing on a missing payload', () => {
    expect(normalizeFavorites(undefined)).toEqual(EMPTY_FAVORITES);
    expect(normalizeFavorites({} as RawFavorites)).toEqual(EMPTY_FAVORITES);
  });

  it('keeps a section that genuinely has no rows', () => {
    expect(normalizeFavorites(raw).othersRoads).toEqual([]);
  });
});

describe('removeFromFavorites', () => {
  it('drops the matching entry and leaves the other sections alone', () => {
    const draft = normalizeFavorites(raw);
    removeFromFavorites(draft, 'wp-7');

    expect(draft.ownWaypoints).toHaveLength(0);
    expect(draft.ownRoads).toHaveLength(1);
    expect(draft.othersWaypoints).toHaveLength(1);
  });

  it('matches on targetId, not favoriteId', () => {
    const draft = normalizeFavorites(raw);
    removeFromFavorites(draft, 'fav-road-1');
    expect(draft.ownRoads).toHaveLength(1);

    removeFromFavorites(draft, 'road-42');
    expect(draft.ownRoads).toHaveLength(0);
  });
});
