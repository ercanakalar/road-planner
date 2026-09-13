import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import renderer, { act } from 'react-test-renderer';

import settingsReducer, { themeModeSet } from 'store/slices/settingsSlice';
import { darkColors, lightColors, ThemeProvider } from 'theme';
import { buildMapStyle } from 'constants/mapStyles';
import useMapStyle from './useMapStyle';

type Style = ReturnType<typeof useMapStyle>;

const renderMapStyle = () => {
  const store = configureStore({ reducer: { settings: settingsReducer } });
  const latest = { current: null as unknown as Style };

  const Probe = () => {
    latest.current = useMapStyle();
    return <Text>probe</Text>;
  };

  act(() => {
    renderer.create(
      <Provider store={store}>
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      </Provider>,
    );
  });

  const setMode = (mode: 'light' | 'dark' | 'system') =>
    act(() => {
      store.dispatch(themeModeSet(mode));
    });

  return { latest, setMode };
};

describe('useMapStyle', () => {
  it('hands the MapView the palette the rest of the app is wearing', () => {
    const { latest, setMode } = renderMapStyle();

    setMode('dark');
    expect(latest.current.mapStyle).toEqual(buildMapStyle(darkColors));
    expect(latest.current.isDark).toBe(true);

    setMode('light');
    expect(latest.current.mapStyle).toEqual(buildMapStyle(lightColors));
    expect(latest.current.isDark).toBe(false);
  });

  it('changes the map key when the theme changes', () => {
    // `userInterfaceStyle` only reaches Google Maps when the map is built, so
    // a map that outlives a theme change keeps the base it was born with. The
    // key is what rebuilds it.
    const { latest, setMode } = renderMapStyle();

    setMode('dark');
    const dark = latest.current.mapKey;

    setMode('light');
    expect(latest.current.mapKey).not.toBe(dark);
  });

  it('keeps the key still while the theme does not change', () => {
    const { latest, setMode } = renderMapStyle();

    setMode('light');
    const key = latest.current.mapKey;
    const style = latest.current.mapStyle;

    setMode('light');
    expect(latest.current.mapKey).toBe(key);
    // A new style array on every render would re-style the map every frame.
    expect(latest.current.mapStyle).toBe(style);
  });
});
