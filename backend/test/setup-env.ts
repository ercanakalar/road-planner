import 'reflect-metadata';

const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL:
    'postgresql://postgres:postgres@localhost:5432/roaddb_test?schema=public',
  ACCESS_KEY: 'test-access-key-that-is-long-enough-32',
  REFRESH_KEY: 'test-refresh-key-that-is-long-enough-32',
  ROAD_SHARE_KEY: 'test-share-key-that-is-long-enough-32!',
  ACCESS_EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
  FRONTEND_URL: 'http://localhost:8081',
  MAIL_HOST: 'smtp.example.test',
  MAIL_PORT: '2525',
  MAIL_USERNAME: 'test',
  MAIL_PASSWORD: 'test',
  MAIL_FROM: 'no-reply@example.test',
  THROTTLE_DISABLED: 'true',
};

for (const [key, value] of Object.entries(TEST_ENV)) {
  process.env[key] = value;
}
