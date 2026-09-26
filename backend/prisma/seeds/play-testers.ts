/**
 * Creates the accounts Google Play testers (and the Play reviewer) sign in
 * with. Safe to re-run: existing accounts are left alone unless --reset is
 * given, in which case their passwords are rotated.
 *
 *   DATABASE_URL=... npm run users:play-testers -- [options]
 *
 *   --count <n>        how many tester accounts to create        (default 12)
 *   --prefix <str>     local-part prefix, numbered from 01       (default playtester)
 *   --domain <str>     email domain                              (default travelroutes.net)
 *   --password <str>   one shared password instead of per-user random ones
 *   --reset            rotate passwords of accounts that already exist
 *   --out <file>       also write the credentials as CSV         (default play-testers.csv)
 *
 * Passwords are hashed exactly as HelperService.toHashPassword does
 * (scrypt N=32768 r=8 p=1, 64-byte key), so the accounts work with the
 * normal email/password sign-in.
 */
import { randomBytes, randomInt, scrypt, ScryptOptions } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { promisify } from 'node:util';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const scryptAsync = promisify<string, string, number, ScryptOptions, Buffer>(
  scrypt,
);

// Keep in sync with src/auth/helper/helper.service.ts.
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1 } as const;
const SCRYPT_KEY_LENGTH = 64;

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');
  const { N, r, p } = SCRYPT_PARAMS;
  const hash = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH, {
    N,
    r,
    p,
    maxmem: 128 * N * r * 2,
  });
  return `scrypt$N=${N},r=${r},p=${p}$${salt}$${hash.toString('hex')}`;
};

// "Play-Kmrt-4821": ≥ 8 chars with a letter and a digit, which is what the
// sign-up validation requires, and short enough to type on a phone.
const randomPassword = (): string => {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const word = Array.from({ length: 4 }, () =>
    letters[randomInt(letters.length)],
  ).join('');
  const digits = String(randomInt(1000, 9999));
  return `Play-${word[0].toUpperCase()}${word.slice(1)}-${digits}`;
};

type Options = {
  count: number;
  prefix: string;
  domain: string;
  password?: string;
  reset: boolean;
  out: string;
};

const parseArgs = (argv: string[]): Options => {
  const options: Options = {
    count: 12,
    prefix: 'playtester',
    domain: 'travelroutes.net',
    reset: false,
    out: 'play-testers.csv',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };

    switch (arg) {
      case '--count':
        options.count = Number.parseInt(next(), 10);
        break;
      case '--prefix':
        options.prefix = next();
        break;
      case '--domain':
        options.domain = next();
        break;
      case '--password':
        options.password = next();
        break;
      case '--reset':
        options.reset = true;
        break;
      case '--out':
        options.out = next();
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.count) || options.count < 1) {
    throw new Error('--count must be a positive integer');
  }

  return options;
};

type Credential = { email: string; password: string; status: string };

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const userPermit = await prisma.permit.findUnique({
      where: { name: 'USER' },
    });
    if (!userPermit) {
      throw new Error(
        'USER permit does not exist — run the migrations/seed first.',
      );
    }

    const width = Math.max(2, String(options.count).length);
    const credentials: Credential[] = [];

    for (let i = 1; i <= options.count; i++) {
      const n = String(i).padStart(width, '0');
      const email = `${options.prefix}${n}@${options.domain}`;
      const nickName = `${options.prefix}${n}`;

      const existing = await prisma.manuelAuth.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existing && !options.reset) {
        credentials.push({ email, password: '(unchanged)', status: 'exists' });
        continue;
      }

      const password = options.password ?? randomPassword();
      const hashed = await hashPassword(password);

      if (existing) {
        await prisma.manuelAuth.update({
          where: { id: existing.id },
          data: { password: hashed },
        });
        credentials.push({ email, password, status: 'password reset' });
        continue;
      }

      await prisma.user.create({
        data: {
          email,
          firstName: 'Play',
          lastName: `Tester ${n}`,
          nickName,
          permitId: userPermit.id,
          manuelAuth: {
            create: { email, password: hashed },
          },
        },
      });
      credentials.push({ email, password, status: 'created' });
    }

    console.table(credentials);

    const csv = [
      'email,password,status',
      ...credentials.map((c) => `${c.email},${c.password},${c.status}`),
    ].join('\n');
    writeFileSync(options.out, `${csv}\n`);
    console.log(
      `\nWrote ${options.out} — share it with testers, do not commit it.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
