import appConfig from 'constants/appConfig';

const API_PREFIX = 'api';

/** The variable the address comes from, named in the error when it is unusable. */
const SOURCE = 'EXPO_PUBLIC_BASE_URL';

/**
 * Rejects an address the app cannot send a request to.
 *
 * Nothing downstream can recover from a bad one: every call fails with a
 * "could not reach the server" that looks like a network problem or a broken
 * API, and the real cause — a typo three layers away in an env file or a
 * compose file — never appears anywhere. `http://10.0.0.1:8081:3000` is the
 * one that keeps happening, a host with the packager's port and the API's port
 * both glued on, and it is not a valid URL at all.
 *
 * Failing at startup is deliberate. An app that boots and then answers every
 * screen with a connection error is harder to diagnose than one that will not
 * boot and says why.
 */
const assertUsable = (raw: string): string => {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error(
      `${SOURCE} is empty. Set it to the address the phone can reach the API ` +
        'on — this machine\'s LAN IP and the API port, such as ' +
        'http://192.168.1.20:3000.',
    );
  }

  try {
    // eslint-disable-next-line no-new
    new URL(trimmed);
  } catch {
    throw new Error(
      `${SOURCE} is not a valid address: ${JSON.stringify(trimmed)}. ` +
        'It should be a scheme, a host and one port, such as ' +
        'http://192.168.1.20:3000 — two ports or a missing host will not work.',
    );
  }

  return trimmed;
};

export const apiOrigin = (raw: string): string =>
  assertUsable(raw)
    .replace(/\/+$/, '')
    .replace(new RegExp(`/${API_PREFIX}$`, 'i'), '');

export const apiBaseUrl = (raw: string): string =>
  `${apiOrigin(raw)}/${API_PREFIX}`;

export const API_ORIGIN = apiOrigin(appConfig.baseUrl);
export const API_BASE_URL = apiBaseUrl(appConfig.baseUrl);
