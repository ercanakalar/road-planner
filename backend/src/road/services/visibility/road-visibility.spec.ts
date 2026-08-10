import { RoadVisibility } from './road-visibility';

describe('RoadVisibility', () => {
  const visibility = new RoadVisibility();

  describe('without a caller', () => {
    it('offers published roads and nothing else', () => {
      expect(visibility.road('road-1', null)).toEqual({
        id: 'road-1',
        isPublic: true,
        archivedAt: null,
      });
    });

    it('never builds a filter that reads as a null user', () => {
      const serialised = JSON.stringify(visibility.road('road-1', null));

      expect(serialised).not.toContain('userId');
    });

    it('offers a waypoint only through its published road', () => {
      expect(visibility.waypoint('wp-1', null)).toEqual({
        id: 'wp-1',
        OR: [{ road: { isPublic: true, archivedAt: null } }],
      });
    });
  });

  describe('with a caller', () => {
    it('covers what they own, what is published and what they saved', () => {
      expect(visibility.road('road-1', 'user-1')).toEqual({
        id: 'road-1',
        OR: [
          { userId: 'user-1', archivedAt: null },
          { isPublic: true, archivedAt: null },
          { favoriteRoads: { some: { userId: 'user-1' } } },
        ],
      });
    });

    it('reaches a waypoint through its road, or by having saved the stop', () => {
      expect(visibility.waypoint('wp-1', 'user-1')).toEqual({
        id: 'wp-1',
        OR: [
          { road: { userId: 'user-1', archivedAt: null } },
          { road: { isPublic: true, archivedAt: null } },
          { road: { favoriteRoads: { some: { userId: 'user-1' } } } },
          { favoriteWaypoints: { some: { userId: 'user-1' } } },
        ],
      });
    });
  });

  describe('archival', () => {
    it('excludes archived roads from every branch that is not a favourite', () => {
      const where = visibility.road('road-1', 'user-1');

      expect(where.OR?.[0]).toMatchObject({ archivedAt: null });
      expect(where.OR?.[1]).toMatchObject({ archivedAt: null });
    });

    it('keeps a favourited road readable after its owner deletes it', () => {
      const where = visibility.road('road-1', 'user-1');

      expect(where.OR?.[2]).toEqual({
        favoriteRoads: { some: { userId: 'user-1' } },
      });
    });

    it('hides archived roads from their owner listing', () => {
      expect(visibility.ownedBy('user-1')).toEqual({
        userId: 'user-1',
        archivedAt: null,
      });
    });

    it('hides archived roads from the discover feed', () => {
      expect(visibility.published()).toEqual({
        isPublic: true,
        archivedAt: null,
      });
    });
  });
});
