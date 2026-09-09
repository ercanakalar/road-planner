import { isValidElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import { centreTabButton } from './CentreTabButton';

// The glyph is not what is under test, and the real one loads a font
// asynchronously, which lands as an act() warning on every render here.
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

/**
 * The props `BottomTabItem` actually hands to `tabBarButton`, spelled the way
 * it spells them. Kept as one fixture because the point of these tests is the
 * shape of that call, not the button's looks.
 */
const button = centreTabButton('heart', 'Favourites');

const tabBarProps = (
  overrides: Partial<BottomTabBarButtonProps> = {},
): BottomTabBarButtonProps =>
  ({
    onPress: jest.fn(),
    onLongPress: jest.fn(),
    testID: 'tab-favourites',
    'aria-label': 'Favourites',
    'aria-selected': false,
    children: null,
    style: { flex: 1 },
    ...overrides,
  }) as BottomTabBarButtonProps;

/**
 * The button itself, found by the role it takes rather than by `findByType`:
 * the preset hands the component under test a different `Pressable` binding
 * than a test file importing it would get, so the two are not the same object.
 * Pressable copies its accessibility props onto the view it renders, so the
 * outermost match is the pressable and the rest are its own output.
 */
const render = (props: BottomTabBarButtonProps) => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(button(props));
  });
  return tree.root.findAll(
    (node) => node.props.accessibilityRole === 'button',
  )[0];
};

describe('centreTabButton', () => {
  it('can be called as a plain function', () => {
    // `BottomTabItem` does `children: button(props)` — it calls this rather
    // than mounting it, so a `memo()` object here throws "Object is not a
    // function" the first time the tab bar renders.
    const props = tabBarProps();

    expect(() => button(props)).not.toThrow();
    expect(isValidElement(button(props))).toBe(true);
  });

  it('presses through to the handler the tab bar gave it', () => {
    const onPress = jest.fn();

    render(tabBarProps({ onPress })).props.onPress();

    expect(onPress).toHaveBeenCalled();
  });

  it('reports the selected state from aria-selected', () => {
    // Not `accessibilityState`: the prop type allows it, because it widens
    // PlatformPressable's, but the tab bar never passes it — so reading that
    // instead type-checks and then silently never fires.
    expect(
      render(tabBarProps({ 'aria-selected': true })).props.accessibilityState,
    ).toEqual({ selected: true });

    expect(
      render(tabBarProps({ 'aria-selected': false })).props.accessibilityState,
    ).toEqual({ selected: false });
  });

  it('labels itself from aria-label, and falls back to the one it was built with', () => {
    expect(
      render(tabBarProps({ 'aria-label': 'Saved places' })).props
        .accessibilityLabel,
    ).toBe('Saved places');

    expect(
      render(tabBarProps({ 'aria-label': undefined })).props.accessibilityLabel,
    ).toBe('Favourites');
  });
});
