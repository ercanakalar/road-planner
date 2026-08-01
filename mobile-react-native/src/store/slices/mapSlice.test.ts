import reducer, {
  closeContextMenu,
  openContextMenuForLocation,
  openContextMenuForWaypoint,
  resetMapState,
  startDraggingWaypoint,
  stopDraggingWaypoint,
} from './mapSlice';

const coordinate = { latitude: 41.01, longitude: 28.98 };

describe('mapSlice', () => {
  it('opens the menu for a dropped pin', () => {
    const state = reducer(undefined, openContextMenuForLocation(coordinate));

    expect(state).toMatchObject({
      clickedLocation: coordinate,
      contextMenuWaypointId: undefined,
      isContextMenuVisible: true,
    });
  });

  it('opens the menu for an existing waypoint', () => {
    const state = reducer(undefined, openContextMenuForWaypoint('wp-1'));

    expect(state).toMatchObject({
      contextMenuWaypointId: 'wp-1',
      clickedLocation: undefined,
      isContextMenuVisible: true,
    });
  });

  it('clears the dropped pin when the menu moves to a waypoint', () => {
    const dropped = reducer(undefined, openContextMenuForLocation(coordinate));
    const state = reducer(dropped, openContextMenuForWaypoint('wp-1'));

    expect(state.clickedLocation).toBeUndefined();
  });

  it('closes the menu without forgetting the pin it acts on', () => {
    const open = reducer(undefined, openContextMenuForLocation(coordinate));
    const state = reducer(open, closeContextMenu());

    expect(state.isContextMenuVisible).toBe(false);
    expect(state.clickedLocation).toEqual(coordinate);
  });

  it('arms a waypoint for dragging and dismisses the menu', () => {
    const open = reducer(undefined, openContextMenuForWaypoint('wp-1'));
    const state = reducer(open, startDraggingWaypoint('wp-1'));

    expect(state.draggingWaypointId).toBe('wp-1');
    expect(state.isContextMenuVisible).toBe(false);
  });

  it('disarms after a drag finishes', () => {
    const dragging = reducer(
      reducer(undefined, openContextMenuForWaypoint('wp-1')),
      startDraggingWaypoint('wp-1'),
    );
    const state = reducer(dragging, stopDraggingWaypoint());

    expect(state.draggingWaypointId).toBeUndefined();
    expect(state.contextMenuWaypointId).toBeUndefined();
  });

  it('resets everything when the screen is left', () => {
    const dirty = reducer(undefined, openContextMenuForLocation(coordinate));
    expect(reducer(dirty, resetMapState())).toEqual({
      clickedLocation: undefined,
      contextMenuWaypointId: undefined,
      isContextMenuVisible: false,
      draggingWaypointId: undefined,
    });
  });
});
