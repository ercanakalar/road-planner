import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import settingsReducer from 'store/slices/settingsSlice';
import { ThemeProvider } from 'theme';
import { RoutePlace } from 'services/mapsService';
import { RouteSearchState } from 'hooks/map/useRouteSearch';
import BlockingOverlay from 'components/feedback/BlockingOverlay';
import RouteSearchSheet from './RouteSearchSheet';

const place = (placeId: string, name: string): RoutePlace => ({
  placeId,
  name,
  address: '',
  latitude: 41,
  longitude: 29,
  types: [],
  distanceFromRouteMeters: 120,
  distanceAlongRouteMeters: 0,
  detourMeters: 0,
  insertAfterIndex: 0,
});

const search = (places: RoutePlace[]): RouteSearchState => ({
  query: '',
  setQuery: jest.fn(),
  category: 'cafe',
  toggleCategory: jest.fn(),
  radiusMeters: 500,
  setRadiusMeters: jest.fn(),
  sortBy: 'detour',
  setSortBy: jest.fn(),
  openNow: false,
  toggleOpenNow: jest.fn(),
  places,
  result: { places, coversWholeRoute: true } as RouteSearchState['result'],
  isSearching: false,
  hasSearched: true,
  isRoutable: true,
  clear: jest.fn(),
});

const renderThemed = (element: React.ReactElement) => {
  const store = configureStore({ reducer: { settings: settingsReducer } });
  let tree!: ReactTestRenderer;

  act(() => {
    tree = renderer.create(
      <Provider store={store}>
        <ThemeProvider>{element}</ThemeProvider>
      </Provider>,
    );
  });

  return tree;
};

const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string | number =>
      ['string', 'number'].includes(typeof child),
    );

describe('RouteSearchSheet', () => {
  it('numbers the places in the order the map numbers their pins', () => {
    const tree = renderThemed(
      <RouteSearchSheet
        visible
        search={search([place('a', 'Kahve Durağı'), place('b', 'Fırın')])}
        onClose={jest.fn()}
        onShowOnMap={jest.fn()}
        onAddStop={jest.fn()}
      />,
    );

    const shown = texts(tree);

    expect(shown.indexOf(1)).toBeLessThan(shown.indexOf('Kahve Durağı'));
    expect(shown.indexOf(2)).toBeLessThan(shown.indexOf('Fırın'));
    expect(shown.indexOf('Kahve Durağı')).toBeLessThan(shown.indexOf(2));
  });
});

describe('BlockingOverlay', () => {
  it('shows its message while visible', () => {
    const tree = renderThemed(
      <BlockingOverlay visible message='Signing you in with Google…' />,
    );

    expect(texts(tree)).toContain('Signing you in with Google…');
  });

  it('ignores the back button, so the screen cannot be left', () => {
    const tree = renderThemed(<BlockingOverlay visible message='Wait' />);

    const modal = tree.root.findByProps({ transparent: true });

    expect(() => modal.props.onRequestClose()).not.toThrow();
    expect(texts(tree)).toContain('Wait');
  });
});
