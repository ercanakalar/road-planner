import reducer, {
  settingsInitialState,
  settingSet,
  settingsRestored,
  settingToggled,
  themeModeSet,
} from './settingsSlice';

describe('settingsSlice', () => {
  it('defaults both preferences on and the theme to automatic', () => {
    expect(reducer(undefined, { type: '@@init' })).toEqual({
      notificationsEnabled: true,
      autoFitRoute: true,
      themeMode: 'system',
    });
  });

  it('toggles a preference', () => {
    const state = reducer(undefined, settingToggled('notificationsEnabled'));
    expect(state.notificationsEnabled).toBe(false);
    expect(state.autoFitRoute).toBe(true);
  });

  it('sets a preference explicitly', () => {
    const state = reducer(
      undefined,
      settingSet({ key: 'autoFitRoute', value: false }),
    );
    expect(state.autoFitRoute).toBe(false);
  });

  it('merges restored preferences over the defaults', () => {
    const state = reducer(
      settingsInitialState,
      settingsRestored({ notificationsEnabled: false }),
    );

    expect(state).toEqual({
      notificationsEnabled: false,
      autoFitRoute: true,
      themeMode: 'system',
    });
  });

  it.each(['light', 'dark', 'system'] as const)(
    'sets the theme mode to %s',
    (mode) => {
      expect(reducer(undefined, themeModeSet(mode)).themeMode).toBe(mode);
    },
  );

  it('leaves the other preferences alone when the theme changes', () => {
    const state = reducer(settingsInitialState, themeModeSet('dark'));

    expect(state.notificationsEnabled).toBe(true);
    expect(state.autoFitRoute).toBe(true);
  });

  it('restores a persisted theme mode', () => {
    const state = reducer(
      settingsInitialState,
      settingsRestored({ themeMode: 'light' }),
    );

    expect(state.themeMode).toBe('light');
  });
});
