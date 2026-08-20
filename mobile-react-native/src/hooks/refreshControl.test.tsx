import React, { cloneElement, memo } from 'react';
import { RefreshControl, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { useRefreshControlColors } from './useRefreshControlColors';

const render = (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
};

const Content = () => <Text>content</Text>;

const asAndroidScrollViewWould = (
  refreshControl: React.ReactElement<{ style?: unknown }>,
) => cloneElement(refreshControl, { style: { flex: 1 } }, <Content />);

describe('the element handed to refreshControl', () => {
  it('is dropped on the floor by a wrapper that only declares its own props', () => {
    const Wrapper = memo(({ refreshing }: { refreshing: boolean }) => (
      <RefreshControl refreshing={refreshing} onRefresh={jest.fn()} />
    ));

    const Screen = () =>
      asAndroidScrollViewWould(<Wrapper refreshing={false} />);

    expect(render(<Screen />).root.findAllByType(Content)).toHaveLength(0);
  });

  it('must therefore be RefreshControl itself, which forwards what it is given', () => {
    let built: React.ReactElement | null = null;

    const Probe = () => {
      const colors = useRefreshControlColors();
      built = (
        <RefreshControl refreshing={false} onRefresh={jest.fn()} {...colors} />
      );
      return null;
    };

    render(<Probe />);

    expect(built).not.toBeNull();
    expect(built!.type).toBe(RefreshControl);
  });
});

describe('useRefreshControlColors', () => {
  it('hands back the same array until the palette changes', () => {
    const seen: unknown[] = [];

    const Probe = () => {
      seen.push(useRefreshControlColors().colors);
      return null;
    };

    const tree = render(<Probe />);
    act(() => {
      tree.update(<Probe />);
    });

    expect(seen).toHaveLength(2);
    expect(seen[1]).toBe(seen[0]);
  });
});
