import appConfig from 'constants/appConfig';

const API_PREFIX = 'api';

export const apiOrigin = (raw: string): string =>
  raw
    .trim()
    .replace(/\/+$/, '')
    .replace(new RegExp(`/${API_PREFIX}$`, 'i'), '');

export const apiBaseUrl = (raw: string): string =>
  `${apiOrigin(raw)}/${API_PREFIX}`;

export const API_ORIGIN = apiOrigin(appConfig.baseUrl);
export const API_BASE_URL = apiBaseUrl(appConfig.baseUrl);
