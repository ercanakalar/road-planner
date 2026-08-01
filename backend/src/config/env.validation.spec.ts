import { EnvironmentVariables, NodeEnv, validateEnv } from './env.validation';

const SECRET = 'a'.repeat(32);

const validEnv = (): Record<string, unknown> => ({
  DATABASE_URL: 'postgresql://user:pw@localhost:5432/roaddb?schema=public',
  ACCESS_KEY: SECRET,
  REFRESH_KEY: SECRET,
  ROAD_SHARE_KEY: SECRET,
  FRONTEND_URL: 'http://localhost:8081',
  MAIL_HOST: 'smtp.example.com',
  MAIL_USERNAME: 'mailer',
  MAIL_PASSWORD: 'pw',
  MAIL_FROM: 'no-reply@example.com',
});

describe('validateEnv', () => {
  it('accepts a minimal valid environment', () => {
    expect(() => validateEnv(validEnv())).not.toThrow();
  });

  it('returns an EnvironmentVariables instance', () => {
    expect(validateEnv(validEnv())).toBeInstanceOf(EnvironmentVariables);
  });

  describe('required variables', () => {
    it.each([
      'DATABASE_URL',
      'ACCESS_KEY',
      'REFRESH_KEY',
      'ROAD_SHARE_KEY',
      'FRONTEND_URL',
      'MAIL_HOST',
      'MAIL_USERNAME',
      'MAIL_PASSWORD',
      'MAIL_FROM',
    ])('fails when %s is absent', (key) => {
      const env = validEnv();
      delete env[key];

      expect(() => validateEnv(env)).toThrow(new RegExp(`- ${key}:`));
    });

    it('reports every problem at once rather than the first', () => {
      const env = validEnv();
      delete env.ACCESS_KEY;
      delete env.REFRESH_KEY;

      expect(() => validateEnv(env)).toThrow(/ACCESS_KEY[\s\S]*REFRESH_KEY/);
    });
  });

  describe('secret strength', () => {
    it.each(['ACCESS_KEY', 'REFRESH_KEY', 'ROAD_SHARE_KEY'])(
      'rejects a %s shorter than 32 characters',
      (key) => {
        const env = { ...validEnv(), [key]: 'too-short' };

        expect(() => validateEnv(env)).toThrow(/at least 32 characters/);
      },
    );

    it('suggests how to generate a secret', () => {
      const env = { ...validEnv(), ACCESS_KEY: 'short' };

      expect(() => validateEnv(env)).toThrow(/openssl rand -base64 48/);
    });
  });

  describe('JWT lifetimes', () => {
    it('defaults ACCESS_EXPIRES_IN to a finite lifetime', () => {
      expect(validateEnv(validEnv()).ACCESS_EXPIRES_IN).toBe('15m');
    });

    it('defaults REFRESH_EXPIRES_IN to a finite lifetime', () => {
      expect(validateEnv(validEnv()).REFRESH_EXPIRES_IN).toBe('7d');
    });

    it.each(['900', '30s', '15m', '12h', '7d', '2w'])(
      'accepts the duration %s',
      (duration) => {
        const env = { ...validEnv(), ACCESS_EXPIRES_IN: duration };

        expect(() => validateEnv(env)).not.toThrow();
      },
    );

    it.each(['forever', '15 minutes', '', 'm15', '-5m'])(
      'rejects the malformed duration %p',
      (duration) => {
        const env = { ...validEnv(), ACCESS_EXPIRES_IN: duration };

        expect(() => validateEnv(env)).toThrow(/ACCESS_EXPIRES_IN/);
      },
    );
  });

  describe('DATABASE_URL', () => {
    it.each(['postgresql://localhost/db', 'postgres://localhost/db'])(
      'accepts %s',
      (url) => {
        expect(() =>
          validateEnv({ ...validEnv(), DATABASE_URL: url }),
        ).not.toThrow();
      },
    );

    it('rejects a non-postgres connection string', () => {
      const env = { ...validEnv(), DATABASE_URL: 'mysql://localhost/db' };

      expect(() => validateEnv(env)).toThrow(
        /postgresql:\/\/ connection string/,
      );
    });
  });

  describe('coercion and defaults', () => {
    it('coerces PORT to a number', () => {
      const result = validateEnv({ ...validEnv(), PORT: '8080' });

      expect(result.PORT).toBe(8080);
    });

    it('rejects a PORT outside the valid range', () => {
      expect(() => validateEnv({ ...validEnv(), PORT: '70000' })).toThrow(
        /PORT/,
      );
    });

    it('rejects a non-numeric PORT', () => {
      expect(() => validateEnv({ ...validEnv(), PORT: 'http' })).toThrow(
        /PORT/,
      );
    });

    it('defaults NODE_ENV to development', () => {
      expect(validateEnv(validEnv()).NODE_ENV).toBe(NodeEnv.Development);
    });

    it('rejects an unknown NODE_ENV', () => {
      const env = { ...validEnv(), NODE_ENV: 'staging' };

      expect(() => validateEnv(env)).toThrow(/NODE_ENV must be one of/);
    });

    it.each([
      ['true', true],
      ['1', true],
      ['false', false],
      ['0', false],
    ])('coerces MAIL_TLS_REJECT_UNAUTHORIZED=%p to %p', (raw, expected) => {
      const env = { ...validEnv(), MAIL_TLS_REJECT_UNAUTHORIZED: raw };

      expect(validateEnv(env).MAIL_TLS_REJECT_UNAUTHORIZED).toBe(expected);
    });

    it('verifies SMTP certificates by default', () => {
      expect(validateEnv(validEnv()).MAIL_TLS_REJECT_UNAUTHORIZED).toBe(true);
    });
  });

  describe('Google OAuth', () => {
    it('boots without any Google configuration', () => {
      expect(() => validateEnv(validEnv())).not.toThrow();
    });

    it('rejects a malformed GOOGLE_REDIRECT_URL when one is supplied', () => {
      const env = { ...validEnv(), GOOGLE_REDIRECT_URL: 'not-a-url' };

      expect(() => validateEnv(env)).toThrow(/GOOGLE_REDIRECT_URL/);
    });
  });

  describe('blank values', () => {
    it.each([
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URL',
      'GOOGLE_SCOPES_API',
      'GOOGLE_OAUTH2_USERINFO_URL',
      'GOOGLE_OAUTH2_ACCESS_TYPE',
      'GOOGLE_OAUTH2_PROMPT',
    ])('treats a blank %s as unset', (key) => {
      const env = { ...validEnv(), [key]: '' };

      expect(() => validateEnv(env)).not.toThrow();
      expect(
        validateEnv(env)[key as keyof EnvironmentVariables],
      ).toBeUndefined();
    });

    it('accepts the whole optional block written as empty strings', () => {
      expect(() =>
        validateEnv({
          ...validEnv(),
          GOOGLE_CLIENT_ID: '',
          GOOGLE_CLIENT_SECRET: '',
          GOOGLE_REDIRECT_URL: '',
          GOOGLE_SCOPES_API: '',
          GOOGLE_OAUTH2_USERINFO_URL: '',
          GOOGLE_OAUTH2_ACCESS_TYPE: '',
          GOOGLE_OAUTH2_PROMPT: '',
        }),
      ).not.toThrow();
    });

    it.each([
      'ACCESS_EXPIRES_IN',
      'REFRESH_EXPIRES_IN',
      'ROAD_SHARE_EXPIRE_IN',
    ])('rejects a blank %s rather than falling back to unset', (key) => {
      expect(() => validateEnv({ ...validEnv(), [key]: '' })).toThrow(
        new RegExp(key),
      );
    });

    it.each([
      'ACCESS_KEY',
      'REFRESH_KEY',
      'ROAD_SHARE_KEY',
      'DATABASE_URL',
      'FRONTEND_URL',
      'MAIL_HOST',
      'MAIL_USERNAME',
      'MAIL_PASSWORD',
      'MAIL_FROM',
    ])('still rejects a blank required %s', (key) => {
      expect(() => validateEnv({ ...validEnv(), [key]: '' })).toThrow(
        new RegExp(key),
      );
    });

    it('keeps a blank CORS_ORIGINS blank, so it denies rather than allows', () => {
      expect(
        validateEnv({ ...validEnv(), CORS_ORIGINS: '' }).CORS_ORIGINS,
      ).toBe('');
    });
  });

  it('points the reader at .env.example on failure', () => {
    expect(() => validateEnv({})).toThrow(/See \.env\.example/);
  });
});
