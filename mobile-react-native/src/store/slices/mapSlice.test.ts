import reducer, {
  closeContextMenu,
  openContextMenuForLocation,
  openContextMenuForStop,
  resetMapState,
  startDraggingStop,
  stopDraggingStop,
} from './mapSlice';

const coordinate = { latitude: 41.01, longitude: 28.98 };

describe('mapSlice', () => {
  it('opens the menu for a dropped pin', () => {
    const state = reducer(undefined, openContextMenuForLocation(coordinate));

    expect(state).toMatchObject({
      clickedLocation: coordinate,
      contextMenuStopId: undefined,
      isContextMenuVisible: true,
    });
  });

  it('opens the menu for an existing stop', () => {
    const state = reducer(undefined, openContextMenuForStop('wp-1'));

    expect(state).toMatchObject({
      contextMenuStopId: 'wp-1',
      clickedLocation: undefined,
      isContextMenuVisible: true,
    });
  });

  it('clears the dropped pin when the menu moves to a stop', () => {
    const dropped = reducer(undefined, openContextMenuForLocation(coordinate));
    const state = reducer(dropped, openContextMenuForStop('wp-1'));

    expect(state.clickedLocation).toBeUndefined();
  });

  it('closes the menu without forgetting the pin it acts on', () => {
    const open = reducer(undefined, openContextMenuForLocation(coordinate));
    const state = reducer(open, closeContextMenu());

    expect(state.isContextMenuVisible).toBe(false);
    expect(state.clickedLocation).toEqual(coordinate);
  });

  it('arms a stop for dragging and dismisses the menu', () => {
    const open = reducer(undefined, openContextMenuForStop('wp-1'));
    const state = reducer(open, startDraggingStop('wp-1'));

    expect(state.draggingStopId).toBe('wp-1');
    expect(state.isContextMenuVisible).toBe(false);
  });

  it('disarms after a drag finishes', () => {
    const dragging = reducer(
      reducer(undefined, openContextMenuForStop('wp-1')),
      startDraggingStop('wp-1'),
    );
    const state = reducer(dragging, stopDraggingStop());

    expect(state.draggingStopId).toBeUndefined();
    expect(state.contextMenuStopId).toBeUndefined();
  });

  it('resets everything when the screen is left', () => {
    const dirty = reducer(undefined, openContextMenuForLocation(coordinate));
    expect(reducer(dirty, resetMapState())).toEqual({
      clickedLocation: undefined,
      contextMenuStopId: undefined,
      isContextMenuVisible: false,
      draggingStopId: undefined,
    });
  });
});
