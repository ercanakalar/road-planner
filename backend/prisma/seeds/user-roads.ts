import 'dotenv/config';
import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const USAGE =
  'Usage: npm run seed:user-roads -- <userId> [--roads 100] [--stops 10] [--public] (DATABASE_URL comes from backend/.env)';

const TITLE_PREFIX = 'Seed route ';
const STEP_DEGREES = 0.012;

const CITIES = [
  { name: 'Ankara', latitude: 39.9334, longitude: 32.8597 },
  { name: 'Istanbul', latitude: 41.0082, longitude: 28.9784 },
  { name: 'Izmir', latitude: 38.4237, longitude: 27.1428 },
  { name: 'Antalya', latitude: 36.8969, longitude: 30.7133 },
  { name: 'Cappadocia', latitude: 38.6431, longitude: 34.6857 },
  { name: 'Bursa', latitude: 40.1885, longitude: 29.0609 },
  { name: 'Eskisehir', latitude: 39.7667, longitude: 30.5256 },
  { name: 'Mugla', latitude: 37.2153, longitude: 28.3636 },
  { name: 'Adana', latitude: 37.0, longitude: 35.3213 },
  { name: 'Trabzon', latitude: 41.0015, longitude: 39.7168 },
  { name: 'Samsun', latitude: 41.2867, longitude: 36.33 },
  { name: 'Konya', latitude: 37.8746, longitude: 32.4932 },
];

type Options = {
  userId: string;
  roads: number;
  stops: number;
  isPublic: boolean;
};

const positiveInt = (flag: string, value: string | undefined): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive whole number\n${USAGE}`);
  }
  return parsed;
};

const parseArgs = (argv: string[]): Options => {
  let userId: string | undefined;
  let roads = 100;
  let stops = 10;
  let isPublic = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--roads') roads = positiveInt(arg, argv[++i]);
    else if (arg === '--stops') stops = positiveInt(arg, argv[++i]);
    else if (arg === '--public') isPublic = true;
    else if (!arg.startsWith('--') && !userId) userId = arg;
    else throw new Error(`Unknown argument: ${arg}\n${USAGE}`);
  }

  if (!userId) throw new Error(`A user id is required.\n${USAGE}`);
  if (stops > 500) throw new Error('--stops cannot exceed 500 per route');

  return { userId, roads, stops, isPublic };
};

const stopAddress = (city: string, order: number, total: number): string => {
  if (order === 1) return `${city} — start`;
  if (order === total) return `${city} — destination`;
  return `${city} — stop ${order}`;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: { id: options.userId },
      select: { id: true, email: true },
    });

    if (!user) throw new Error(`No user with id ${options.userId}`);

    const alreadySeeded = await prisma.road.count({
      where: { userId: user.id, title: { startsWith: TITLE_PREFIX } },
    });

    const now = Date.now();
    const roads: {
      id: string;
      userId: string;
      title: string;
      description: string;
      isPublic: boolean;
      createdAt: Date;
    }[] = [];
    const stops: {
      id: string;
      roadId: string;
      latitude: number;
      longitude: number;
      order: number;
      address: string;
      elevation: number;
    }[] = [];

    for (let i = 0; i < options.roads; i++) {
      const number = alreadySeeded + i + 1;
      const city = CITIES[(number - 1) % CITIES.length];
      const roadId = randomUUID();
      const heading = ((number * 37) % 360) * (Math.PI / 180);

      roads.push({
        id: roadId,
        userId: user.id,
        title: `${TITLE_PREFIX}${number}`,
        description: `${options.stops} stops around ${city.name}`,
        isPublic: options.isPublic,
        createdAt: new Date(now - i * 60_000),
      });

      for (let order = 1; order <= options.stops; order++) {
        const step = order - 1;
        const bend = Math.sin(step / 2) * 0.3;

        stops.push({
          id: randomUUID(),
          roadId,
          latitude:
            city.latitude + Math.cos(heading + bend) * STEP_DEGREES * step,
          longitude:
            city.longitude + Math.sin(heading + bend) * STEP_DEGREES * step,
          order,
          address: stopAddress(city.name, order, options.stops),
          elevation: 100 + ((number * 37 + order * 83) % 1200),
        });
      }
    }

    await prisma.$transaction([
      prisma.road.createMany({ data: roads }),
      prisma.stop.createMany({ data: stops }),
    ]);

    console.log(
      `Created ${roads.length} routes with ${options.stops} stops each (${stops.length} stops) for ${user.email}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
