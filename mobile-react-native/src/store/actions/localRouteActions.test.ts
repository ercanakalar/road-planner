import { uploadLocalRoutes } from './localRouteActions';
import { routeService } from 'store/services/routeService';
import { LocalRoute } from 'types/local-route';

jest.mock('services/notificationService', () => ({
  showNotification: jest.fn(),
}));

const route = (id: string, title: string, stopCount = 2): LocalRoute => ({
  id,
  title,
  description: '',
  stops: Array.from({ length: stopCount }, (_, index) => ({
    id: `${id}-stop-${index}`,
    latitude: 41 + index,
    longitude: 29 + index,
    order: index + 1,
    address: `Stop ${index + 1}`,
  })),
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
});

const harness = (routes: LocalRoute[], isLoggedIn = true) => {
  const dispatched: unknown[] = [];

  const dispatch = jest.fn((action: unknown) => {
    dispatched.push(action);

    const isSliceAction =
      typeof action === 'object' &&
      action !== null &&
      'type' in (action as Record<string, unknown>);

    return isSliceAction ? action : { unwrap: () => Promise.resolve({}) };
  }) as never;

  const getState = (() => ({
    localRoute: { routes },
    auth: { isLoggedIn },
  })) as never;

  return { dispatch, dispatched, getState };
};

const savedTitles = (dispatched: unknown[]) =>
  dispatched
    .filter(
      (action): action is { title: string } =>
        typeof action === 'object' &&
        action !== null &&
        'title' in (action as Record<string, unknown>),
    )
    .map((action) => action.title);

beforeEach(() => {
  jest.clearAllMocks();

  jest
    .spyOn(routeService.endpoints.createRoute, 'initiate')
    .mockImplementation(((body: { title: string }) => body) as never);
});

describe('uploadLocalRoutes', () => {
  it('saves every route on the device when none is named', async () => {
    const { dispatch, dispatched, getState } = harness([
      route('a', 'Coast'),
      route('b', 'Mountains'),
    ]);

    await uploadLocalRoutes()(dispatch, getState);

    expect(savedTitles(dispatched)).toEqual(['Coast', 'Mountains']);
  });

  it('saves only the route it was given', async () => {
    const { dispatch, dispatched, getState } = harness([
      route('a', 'Coast'),
      route('b', 'Mountains'),
    ]);

    await uploadLocalRoutes({ routeId: 'b' })(dispatch, getState);

    expect(savedTitles(dispatched)).toEqual(['Mountains']);
  });

  it('takes only the named route off the device', async () => {
    const { dispatch, dispatched, getState } = harness([
      route('a', 'Coast'),
      route('b', 'Mountains'),
    ]);

    const result = await uploadLocalRoutes({ routeId: 'b' })(dispatch, getState);

    expect(result).toEqual({ uploaded: 1, failed: 0 });
    expect(dispatched).toContainEqual(
      expect.objectContaining({
        type: 'localRoute/localRouteUploadFinished',
        payload: { uploadedIds: ['b'] },
      }),
    );
  });

  it('does nothing for a route id that is not on the device', async () => {
    const { dispatch, dispatched, getState } = harness([route('a', 'Coast')]);

    const result = await uploadLocalRoutes({ routeId: 'gone' })(
      dispatch,
      getState,
    );

    expect(result).toEqual({ uploaded: 0, failed: 0 });
    expect(savedTitles(dispatched)).toEqual([]);
  });

  it('skips a named route that has no stops', async () => {
    const { dispatch, getState } = harness([route('a', 'Empty', 0)]);

    expect(await uploadLocalRoutes({ routeId: 'a' })(dispatch, getState)).toEqual(
      { uploaded: 0, failed: 0 },
    );
  });

  it('saves nothing at all when signed out', async () => {
    const { dispatch, getState } = harness([route('a', 'Coast')], false);

    expect(await uploadLocalRoutes({ routeId: 'a' })(dispatch, getState)).toEqual(
      { uploaded: 0, failed: 0 },
    );
  });
});
