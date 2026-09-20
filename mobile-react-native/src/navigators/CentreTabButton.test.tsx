import { isValidElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import { centreTabButton } from './CentreTabButton';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

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
