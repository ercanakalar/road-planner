import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import renderer, { act } from 'react-test-renderer';

import authReducer from 'store/slices/authSlice';
import localRouteReducer, {
  localRouteCreated,
  localRouteDeleted,
  localRouteSelected,
} from 'store/slices/localRouteSlice';
import useMapScreen from './useMapScreen';

// The map itself is out of scope here: what the screen needs from it is the
// active route and the list, read from the store like the real hook does.
jest.mock('hooks/map/useLocalMapLogic', () => {
  const { useAppSelector } = jest.requireActual('store/hook');

  return {
    __esModule: true,
    default: function useLocalMapLogicStub() {
      const { routes, activeRouteId } = useAppSelector(
        (state: {
          localRoute: { routes: { id: string }[]; activeRouteId?: string };
        }) => state.localRoute,
      );

      return {
        routes,
        activeRoute: routes.find(
          (route: { id: string }) => route.id === activeRouteId,
        ),
        routeLine: {},
        focusOnPlace: jest.fn(),
        handleAddPlaceAsStop: jest.fn(),
      };
    },
  };
});
jest.mock('hooks/map/useStopPair', () => ({
  __esModule: true,
  default: () => ({}),
}));
jest.mock('hooks/feedback/useConfirm', () => ({
  __esModule: true,
  default: () => jest.fn(),
}));
jest.mock('services/usageReporter', () => ({ reportUsage: jest.fn() }));

type Screen = ReturnType<typeof useMapScreen>;

const renderMapScreen = () => {
  const store = configureStore({
    reducer: { auth: authReducer, localRoute: localRouteReducer },
  });
  const latest = { current: null as unknown as Screen };

  const Probe = () => {
    latest.current = useMapScreen();
    return <Text>probe</Text>;
  };

  act(() => {
    renderer.create(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );
  });

  const routes = () => store.getState().localRoute.routes;

  return { store, latest, routes };
};

describe('useMapScreen — the route details editor', () => {
  it('opens with no route yet, and saving starts one under that name', () => {
    const { latest, routes } = renderMapScreen();

    act(() => latest.current.openDetailsEditor());
    expect(latest.current.isEditingDetails).toBe(true);
    expect(latest.current.detailsDraft).toEqual({
      title: undefined,
      description: undefined,
    });

    act(() =>
      latest.current.handleSaveDetails({
        title: 'Coast road',
        description: 'Along the sea',
      }),
    );

    expect(latest.current.isEditingDetails).toBe(false);
    expect(routes()).toHaveLength(1);
    expect(routes()[0]).toMatchObject({
      title: 'Coast road',
      description: 'Along the sea',
    });
  });

  it('saves to the route it was opened for, even if another became active', () => {
    const { store, latest, routes } = renderMapScreen();
    let first = '';
    let second = '';

    act(() => {
      first = store.dispatch(localRouteCreated('First')).payload.id;
      second = store.dispatch(localRouteCreated('Second')).payload.id;
      store.dispatch(localRouteSelected(first));
    });

    act(() => latest.current.openDetailsEditor());
    expect(latest.current.detailsDraft.title).toBe('First');

    act(() => {
      store.dispatch(localRouteSelected(second));
    });
    act(() =>
      latest.current.handleSaveDetails({ title: 'Renamed', description: '' }),
    );

    expect(routes().find((route) => route.id === first)?.title).toBe(
      'Renamed',
    );
    expect(routes().find((route) => route.id === second)?.title).toBe(
      'Second',
    );
  });

  it('closes without writing when that route has left the device', () => {
    const { store, latest, routes } = renderMapScreen();
    let only = '';

    act(() => {
      only = store.dispatch(localRouteCreated('Uploaded')).payload.id;
    });
    act(() => latest.current.openDetailsEditor());
    act(() => {
      store.dispatch(localRouteDeleted(only));
    });

    act(() =>
      latest.current.handleSaveDetails({ title: 'Too late', description: '' }),
    );

    expect(latest.current.isEditingDetails).toBe(false);
    expect(routes()).toEqual([]);
  });
});
