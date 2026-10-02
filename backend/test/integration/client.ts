import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../src/generated/prisma/client';

// The integration suites run against a real, migrated database and are
// skipped without one:
//
//   INTEGRATION_DATABASE_URL=postgresql://… npm run test:integration
export const INTEGRATION_DATABASE_URL = process.env.INTEGRATION_DATABASE_URL;

export const describeIntegration = INTEGRATION_DATABASE_URL
  ? describe
  : describe.skip;

export const integrationClient = (): PrismaClient =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: INTEGRATION_DATABASE_URL }),
  });
