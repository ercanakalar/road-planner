import {
  EMPTY_FAVORITES,
  applyFavoriteAnnotation,
  normalizeFavorites,
  removeFromFavorites,
} from './favoriteAdapter';
import { RawFavorites } from 'types/store/services/favoriteService-type';

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
  ownStops: [
    {
      id: 'fav-wp-1',
      title: null,
      description: null,
      stop: {
        id: 'wp-7',
        latitude: 41.0082,
        longitude: 28.9784,
        address: 'Sultanahmet Sq, Fatih, İstanbul, Türkiye',
      },
    },
  ],
  othersRoads: [],
  othersStops: [
    {
      id: 'fav-wp-2',
      title: null,
      description: null,
      stop: {
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
      annotationTitle: undefined,
      annotationDescription: undefined,
      defaultTitle: 'Coast run',
      isOwn: true,
      isWithdrawn: false,
    });
  });

  it('marks a saved road whose owner has removed the original', () => {
    const withdrawn = {
      ...raw,
      ownRoads: [
        {
          ...raw.ownRoads[0],
          road: { ...raw.ownRoads[0].road!, archivedAt: '2026-08-03T00:00:00Z' },
        },
      ],
    } satisfies RawFavorites;

    expect(normalizeFavorites(withdrawn).ownRoads[0].isWithdrawn).toBe(true);
  });

  it('points targetId at the stop and titles it from the address', () => {
    expect(normalizeFavorites(raw).ownStops[0]).toEqual({
      favoriteId: 'fav-wp-1',
      targetId: 'wp-7',
      kind: 'stop',
      title: 'Sultanahmet Sq',
      // The country is the same for every stop on a domestic route, so the
      // subtitle drops it — but `address`, which is what gets copied, keeps it.
      subtitle: 'Fatih, İstanbul',
      address: 'Sultanahmet Sq, Fatih, İstanbul, Türkiye',
      annotationTitle: undefined,
      annotationDescription: undefined,
      defaultTitle: 'Sultanahmet Sq',
      isOwn: true,
    });
  });

  it('falls back to coordinates when the stop has no address', () => {
    const entry = normalizeFavorites(raw).othersStops[0];

    expect(entry.title).toBe('39.9334, 32.8597');
    expect(entry.subtitle).toBe('39.9334, 32.8597');
    expect(entry.address).toBeUndefined();
  });

  it('titles a stop by coordinates when its address is only noise', () => {
    // Google answers a pin dropped off any road with a Plus Code, which says
    // no more than the coordinates do and reads like a serial number.
    const plusCode = {
      ...raw,
      othersStops: [
        {
          ...raw.othersStops[0],
          stop: {
            ...raw.othersStops[0].stop,
            address: '7GXR+8C',
          },
        },
      ],
    } satisfies RawFavorites;

    expect(normalizeFavorites(plusCode).othersStops[0].title).toBe(
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

describe('annotations', () => {
  it("prefers the user's own label over the target's name", () => {
    const annotated = normalizeFavorites({
      ...raw,
      ownRoads: [{ ...raw.ownRoads[0], title: 'Sunday drive' }],
    });

    expect(annotated.ownRoads[0].title).toBe('Sunday drive');
    expect(annotated.ownRoads[0].defaultTitle).toBe('Coast run');
    expect(annotated.ownRoads[0].annotationTitle).toBe('Sunday drive');
  });

  it('applies an annotation to the cached entry', () => {
    const draft = normalizeFavorites(raw);
    applyFavoriteAnnotation(draft, 'fav-road-1', {
      title: 'Sunday drive',
      description: 'With a coffee stop',
    });

    expect(draft.ownRoads[0].title).toBe('Sunday drive');
    expect(draft.ownRoads[0].subtitle).toBe('With a coffee stop');
  });

  it('falls back to the original name when the label is cleared', () => {
    const draft = normalizeFavorites({
      ...raw,
      ownRoads: [{ ...raw.ownRoads[0], title: 'Sunday drive' }],
    });
    applyFavoriteAnnotation(draft, 'fav-road-1', { title: '' });

    expect(draft.ownRoads[0].title).toBe('Coast run');
    expect(draft.ownRoads[0].annotationTitle).toBeUndefined();
  });

  it('leaves untouched fields alone', () => {
    const draft = normalizeFavorites(raw);
    applyFavoriteAnnotation(draft, 'fav-road-1', { description: 'Notes' });

    expect(draft.ownRoads[0].title).toBe('Coast run');
    expect(draft.ownRoads[0].subtitle).toBe('Notes');
  });
});

describe('removeFromFavorites', () => {
  it('drops the matching entry and leaves the other sections alone', () => {
    const draft = normalizeFavorites(raw);
    removeFromFavorites(draft, 'wp-7');

    expect(draft.ownStops).toHaveLength(0);
    expect(draft.ownRoads).toHaveLength(1);
    expect(draft.othersStops).toHaveLength(1);
  });

  it('matches on targetId, not favoriteId', () => {
    const draft = normalizeFavorites(raw);
    removeFromFavorites(draft, 'fav-road-1');
    expect(draft.ownRoads).toHaveLength(1);

    removeFromFavorites(draft, 'road-42');
    expect(draft.ownRoads).toHaveLength(0);
  });
});
