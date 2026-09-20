import appConfig from 'constants/appConfig';

const API_PREFIX = 'api';

const SOURCE = 'EXPO_PUBLIC_BASE_URL';

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
