import { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const DEFAULT_THROTTLE: ThrottlerOptions[] = [
  { name: 'default', ttl: MINUTE, limit: 120 },
];

export function shouldSkipThrottle(): boolean {
  return (
    process.env.NODE_ENV === 'test' && process.env.THROTTLE_DISABLED === 'true'
  );
}

export const throttlerOptions: ThrottlerModuleOptions = {
  throttlers: DEFAULT_THROTTLE,
  skipIf: shouldSkipThrottle,
};

export const MAPS_THROTTLE = {
  directions: { default: { ttl: MINUTE, limit: 60 } },

  geocode: { default: { ttl: MINUTE, limit: 40 } },

  places: { default: { ttl: MINUTE, limit: 90 } },

  routeSearch: { default: { ttl: MINUTE, limit: 12 } },
} as const;

export const AUTH_THROTTLE = {
  signIn: { default: { ttl: MINUTE, limit: 10 } },

  signUp: { default: { ttl: MINUTE, limit: 10 } },

  forgotPassword: { default: { ttl: MINUTE, limit: 3 } },

  resetPassword: { default: { ttl: MINUTE, limit: 10 } },

  refreshToken: { default: { ttl: MINUTE, limit: 20 } },
} as const;

export const USER_THROTTLE = {
  // The profile screen asks once per pause in typing; this is generous for a
  // person and tight enough that walking the nickname space is not practical.
  nicknameCheck: { default: { ttl: MINUTE, limit: 30 } },
} as const;

export const STATISTICS_THROTTLE = {
  // The app reports a handful of on-device events per session, in batches.
  report: { default: { ttl: MINUTE, limit: 30 } },
} as const;

export const CONSENT_THROTTLE = {
  // Sent once per sign-in.
  grant: { default: { ttl: MINUTE, limit: 10 } },

  // Erases an account: there is never a reason to ask often.
  withdraw: { default: { ttl: MINUTE, limit: 3 } },
} as const;
