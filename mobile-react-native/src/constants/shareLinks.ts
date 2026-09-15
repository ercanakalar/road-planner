import appConfig from 'constants/appConfig';

export const SHARE_PATH = 'share';

/**
 * Where a link to a published route points. Unlike a share link this carries
 * the route's own id rather than a token: the route is public, so there is
 * nothing for a token to grant.
 *
 * `backend/src/notification/publish/route-publish.notifier.ts` builds the same
 * path into the email it sends an author's followers.
 */
export const ROUTE_PATH = 'route';

export const APP_SCHEME = 'net.travelroutes.travelroutes';

const trimBase = (value: string): string => value.trim().replace(/\/+$/, '');

export const schemeShareLink = (token: string): string =>
  `${APP_SCHEME}://${SHARE_PATH}/${token}`;

export const buildShareLink = (token: string, serverUrl?: string): string => {
  const configured = trimBase(appConfig.shareLinkBaseUrl ?? '');
  if (configured) return `${configured}/${SHARE_PATH}/${token}`;

  const fromServer = serverUrl?.trim() ?? '';
  if (fromServer.startsWith('https://')) return fromServer;

  return schemeShareLink(token);
};

export const shareTokenFromUrl = (url: string): string | null => {
  const match = url.match(new RegExp(`/${SHARE_PATH}/([^/?#]+)`));

  return match ? decodeURIComponent(match[1]) : null;
};

export const linkingPrefixes = (): string[] => {
  const configured = trimBase(appConfig.shareLinkBaseUrl ?? '');

  return [`${APP_SCHEME}://`, ...(configured ? [configured] : [])];
};
