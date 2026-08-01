import reducer, {
  settingsInitialState,
  settingSet,
  settingsRestored,
  settingToggled,
} from './settingsSlice';

describe('settingsSlice', () => {
  it('defaults both preferences on', () => {
    expect(reducer(undefined, { type: '@@init' })).toEqual({
      notificationsEnabled: true,
      autoFitRoute: true,
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
    });
  });
});
