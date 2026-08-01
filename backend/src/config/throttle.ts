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

export const AUTH_THROTTLE = {
  signIn: { default: { ttl: MINUTE, limit: 10 } },

  signUp: { default: { ttl: MINUTE, limit: 10 } },

  forgotPassword: { default: { ttl: MINUTE, limit: 3 } },

  resetPassword: { default: { ttl: MINUTE, limit: 10 } },

  refreshToken: { default: { ttl: MINUTE, limit: 20 } },
} as const;
