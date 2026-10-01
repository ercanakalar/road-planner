import TestRenderer, { act } from 'react-test-renderer';

import 'i18n';
import MapToolbar from './MapToolbar';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const render = (overrides: Partial<Parameters<typeof MapToolbar>[0]> = {}) => {
  const props = {
    top: 0,
    title: 'My route',
    canSwitch: false,
    hasActiveRoute: true,
    canStartNewRoute: true,
    onSwitch: jest.fn(),
    onEditDetails: jest.fn(),
    onNewRoute: jest.fn(),
    onDeleteRoute: jest.fn(),
    onImportFromGoogleMaps: jest.fn(),
    ...overrides,
  };

  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<MapToolbar {...props} />);
  });

  const newRouteButtons = tree.root.findAll(
    (node) =>
      node.props.accessibilityRole === 'button' &&
      node.props.onPress === props.onNewRoute,
  );

  return { props, newRouteButtons };
};

describe('MapToolbar', () => {
  it('offers a new route once the current one has a stop', () => {
    const { props, newRouteButtons } = render({ canStartNewRoute: true });

    expect(newRouteButtons).toHaveLength(1);

    act(() => newRouteButtons[0].props.onPress());
    expect(props.onNewRoute).toHaveBeenCalledTimes(1);
  });

  it('hides the new-route button while the current route has no stops', () => {
    expect(render({ canStartNewRoute: false }).newRouteButtons).toHaveLength(0);
  });

  it('hides it on a map with no route at all', () => {
    expect(
      render({ hasActiveRoute: false, canStartNewRoute: false })
        .newRouteButtons,
    ).toHaveLength(0);
  });
});
