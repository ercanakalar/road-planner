import React from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderer, { act } from 'react-test-renderer';

import KvkkGate from './KvkkGate';
import {
  KVKK_CONSENT_VERSION,
  KVKK_COPY,
  KVKK_LANGUAGES,
} from 'constants/kvkk';
import store from 'store';
import { kvkkHydrated } from 'store/slices/kvkkSlice';
import { KvkkConsentRecord } from 'types/kvkk';

const App = () => <Text>the app</Text>;

// SafeAreaProvider renders nothing until it knows the insets, and off a device
// it never measures any — so the test hands it a phone's worth.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const render = () => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <Provider store={store}>
        <SafeAreaProvider initialMetrics={METRICS}>
          <KvkkGate>
            <App />
          </KvkkGate>
        </SafeAreaProvider>
      </Provider>,
    );
  });
  return tree;
};

const hydrate = (consent: KvkkConsentRecord | null) => {
  act(() => {
    store.dispatch(kvkkHydrated(consent));
  });
};

const isAppShowing = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(App).length > 0;

/** The rendered text, so an assertion need not know which language shows. */
const shows = (tree: renderer.ReactTestRenderer, phrases: string[]) => {
  const rendered = JSON.stringify(tree.toJSON());
  return phrases.some((phrase) => rendered.includes(phrase));
};

type Pick = (copy: (typeof KVKK_COPY)['tr']) => string;

const inEveryLanguage = (pick: Pick) =>
  KVKK_LANGUAGES.map((language) => pick(KVKK_COPY[language]));

/** Presses the button carrying the given label, in whichever language shows. */
const press = (tree: renderer.ReactTestRenderer, pick: Pick) => {
  const labels = inEveryLanguage(pick);
  const [button] = tree.root.findAll(
    (node) =>
      typeof node.props?.onPress === 'function' &&
      labels.includes(node.props?.label),
  );

  expect(button).toBeDefined();
  act(() => {
    button.props.onPress();
  });
};

const currentConsent: KvkkConsentRecord = {
  version: KVKK_CONSENT_VERSION,
  acceptedAt: '2026-08-24T09:00:00.000Z',
  language: 'tr',
};

describe('KvkkGate', () => {
  it('holds the app back on a device that has not consented', () => {
    hydrate(null);

    const tree = render();

    expect(isAppShowing(tree)).toBe(false);
    expect(shows(tree, inEveryLanguage((copy) => copy.acceptLabel))).toBe(true);
  });

  it('lets the app through once the notice is accepted', () => {
    hydrate(null);
    const tree = render();

    press(tree, (copy) => copy.acceptLabel);

    expect(isAppShowing(tree)).toBe(true);
    expect(store.getState().kvkk.consent).toMatchObject({
      version: KVKK_CONSENT_VERSION,
    });
  });

  it('explains itself rather than giving way when declined', () => {
    hydrate(null);
    const tree = render();

    press(tree, (copy) => copy.declineLabel);

    expect(isAppShowing(tree)).toBe(false);
    expect(shows(tree, inEveryLanguage((copy) => copy.declinedTitle))).toBe(
      true,
    );
  });

  it('opens straight into the app for a device that already consented', () => {
    hydrate(currentConsent);

    expect(isAppShowing(render())).toBe(true);
  });

  it('asks again, saying why, when the notice has changed since', () => {
    hydrate({ ...currentConsent, version: '2020-01-01' });

    const tree = render();

    expect(isAppShowing(tree)).toBe(false);
    expect(shows(tree, inEveryLanguage((copy) => copy.updatedNotice))).toBe(
      true,
    );
  });
});
