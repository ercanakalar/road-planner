import reducer, {
  languageSet,
  settingsInitialState,
  settingSet,
  settingsRestored,
  settingToggled,
  themeModeSet,
} from './settingsSlice';

describe('settingsSlice', () => {
  it('defaults both preferences on, the theme automatic, the language unset', () => {
    expect(reducer(undefined, { type: '@@init' })).toEqual({
      notificationsEnabled: true,
      autoFitRoute: true,
      themeMode: 'system',
      // Null rather than 'en': nothing has been chosen, so the phone decides.
      language: null,
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
      language: null,
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

  it.each(['en', 'tr'] as const)('sets the language to %s', (language) => {
    expect(reducer(undefined, languageSet(language)).language).toBe(language);
  });

  it('keeps a chosen language across a restore that does not mention one', () => {
    // A restore carries whatever was on disk. Letting a missing key reset the
    // language would put somebody back on the phone's every time they reopened
    // the app, which is the opposite of having chosen.
    const chosen = reducer(settingsInitialState, languageSet('tr'));
    const state = reducer(chosen, settingsRestored({ themeMode: 'dark' }));

    expect(state.language).toBe('tr');
  });
});
