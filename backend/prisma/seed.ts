import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const USER_COUNT = 100;
const ROUTE_COUNT = 10000;

const STOPS_PER_ROUTE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const stopsForRoute = (routeNumber: number): number =>
  STOPS_PER_ROUTE[(routeNumber - 1) % STOPS_PER_ROUTE.length];

const PASSWORD =
  'scrypt$N=32768,r=8,p=1$0ec907d1c25a7f02b83a91642aa46ecd$31bd9436cee82d891d02fc1b9f06ad53b0a47f9234d8c08042d567b5eaa5654d3b07e0d63abca85eed2b4b54bc296ca8898155756f18eab6b063270c289155e9';

const PERMISSIONS = ['ACCESS_DASHBOARD', 'MANAGE_USERS'] as const;

const PERMITS = [
  {
    name: 'ADMIN',
    description: 'Full administrative access',
    permissions: ['ACCESS_DASHBOARD', 'MANAGE_USERS'],
  },
  {
    name: 'USER',
    description: 'Default permit granted on registration',
    permissions: [],
  },
] as const;

const CITIES = [
  {
    name: 'Ankara',
    latitude: 39.9334,
    longitude: 32.8597,
  },
  {
    name: 'Istanbul',
    latitude: 41.0082,
    longitude: 28.9784,
  },
  {
    name: 'Izmir',
    latitude: 38.4237,
    longitude: 27.1428,
  },
  {
    name: 'Antalya',
    latitude: 36.8969,
    longitude: 30.7133,
  },
  {
    name: 'Cappadocia',
    latitude: 38.6431,
    longitude: 34.6857,
  },
  {
    name: 'Bursa',
    latitude: 40.1885,
    longitude: 29.0609,
  },
  {
    name: 'Eskisehir',
    latitude: 39.7667,
    longitude: 30.5256,
  },
  {
    name: 'Mugla',
    latitude: 37.2153,
    longitude: 28.3636,
  },
  {
    name: 'Adana',
    latitude: 37.0,
    longitude: 35.3213,
  },
  {
    name: 'Trabzon',
    latitude: 41.0015,
    longitude: 39.7168,
  },
  {
    name: 'Samsun',
    latitude: 41.2867,
    longitude: 36.33,
  },
  {
    name: 'Konya',
    latitude: 37.8746,
    longitude: 32.4932,
  },
];

async function getOrCreatePermission(
  name: string,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.permission.findUnique({
    where: { name },
  });

  if (existing) {
    return existing;
  }

  return prisma.permission.create({
    data: {
      name,
    },
  });
}

async function getOrCreatePermit(
  name: string,
  description: string,
  permissionNames: readonly string[],
): Promise<{ id: string; name: string }> {
  const existing = await prisma.permit.findUnique({
    where: { name },
  });

  const permissions = await prisma.permission.findMany({
    where: {
      name: {
        in: [...permissionNames],
      },
    },
  });

  if (existing) {
    await prisma.permit.update({
      where: {
        id: existing.id,
      },
      data: {
        description,
        permissions: {
          set: permissions.map((permission) => ({
            id: permission.id,
          })),
        },
      },
    });

    return existing;
  }

  return prisma.permit.create({
    data: {
      name,
      description,
      permissions: {
        connect: permissions.map((permission) => ({
          id: permission.id,
        })),
      },
    },
  });
}

async function getOrCreateUser(
  index: number,
  permitId: string,
): Promise<{ id: string; email: string }> {
  const email = index === 0 ? 'test@test.com' : `test${index}@test.com`;

  const firstName = index === 0 ? 'Test' : `Test${index}`;

  const lastName = index === 0 ? 'User' : `User${index}`;

  const nickName = index === 0 ? 'test-user' : `test${index}`;

  const existing = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existing) {
    if (existing.permitId !== permitId) {
      await prisma.user.update({
        where: {
          id: existing.id,
        },
        data: {
          permitId,
          firstName,
          lastName,
          nickName,
        },
      });
    }

    return {
      id: existing.id,
      email,
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      nickName,
      permitId,

      createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
    },
  });

  return {
    id: user.id,
    email,
  };
}

async function getOrCreateManuelAuth(
  userId: string,
  email: string,
  createdAt: Date,
): Promise<void> {
  const existing = await prisma.manuelAuth.findUnique({
    where: {
      email,
    },
  });

  if (existing) {
    return;
  }

  await prisma.manuelAuth.create({
    data: {
      email,
      password: PASSWORD,
      userId,
      createdAt,
    },
  });
}

async function createUsers(): Promise<
  Array<{
    id: string;
    email: string;
  }>
> {
  const adminPermit = await prisma.permit.findUnique({
    where: {
      name: 'ADMIN',
    },
  });

  const userPermit = await prisma.permit.findUnique({
    where: {
      name: 'USER',
    },
  });

  if (!adminPermit || !userPermit) {
    throw new Error('Required permits were not created.');
  }

  const users = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const permitId = i === 0 ? adminPermit.id : userPermit.id;

    const user = await getOrCreateUser(i, permitId);

    await getOrCreateManuelAuth(
      user.id,
      user.email,
      new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    );

    users.push(user);

    if ((i + 1) % 50 === 0) {
      console.log(`Users: ${i + 1}/${USER_COUNT}`);
    }
  }

  return users;
}

async function createRoutes(
  users: Array<{
    id: string;
    email: string;
  }>,
): Promise<
  Array<{
    id: string;
    userId: string;
    routeNumber: number;
  }>
> {
  const existingRoutes = await prisma.road.findMany({
    where: {
      title: {
        startsWith: 'Test Route ',
      },
    },
    select: {
      id: true,
      userId: true,
      title: true,
    },
  });

  const existingByTitle = new Map(
    existingRoutes.map((route) => [route.title, route]),
  );

  const routes = [];

  for (let i = 1; i <= ROUTE_COUNT; i++) {
    const userIndex = (i - 1) % users.length;

    const user = users[userIndex];

    const slot = Math.floor((i - 1) / users.length);

    const city = CITIES[(i - 1) % CITIES.length];

    const title = `Test Route ${i}`;

    const existing = existingByTitle.get(title);

    if (existing) {
      routes.push({
        id: existing.id,
        userId: existing.userId,
        routeNumber: i,
      });

      continue;
    }

    const createdAt = new Date(Date.now() - (i % 365) * 24 * 60 * 60 * 1000);

    const road = await prisma.road.create({
      data: {
        userId: user.id,
        title,
        description: `Demo route around ${city.name}`,
        isPublic: i % 3 !== 0,

        archivedAt:
          (userIndex + slot) % 50 === 0
            ? new Date(Date.now() - (i % 90) * 24 * 60 * 60 * 1000)
            : null,

        createdAt,
      },
    });

    routes.push({
      id: road.id,
      userId: user.id,
      routeNumber: i,
    });

    if (i % 250 === 0) {
      console.log(`Routes: ${i}/${ROUTE_COUNT}`);
    }
  }

  return routes;
}

async function createStops(
  routes: Array<{
    id: string;
    userId: string;
    routeNumber: number;
  }>,
): Promise<void> {
  const existingStops = await prisma.stop.findMany({
    where: {
      roadId: {
        in: routes.map((route) => route.id),
      },
    },
    select: {
      roadId: true,
      order: true,
    },
  });

  const existingKeys = new Set(
    existingStops.map((stop) => `${stop.roadId}:${stop.order}`),
  );

  const batchSize = 1000;

  let batch: Array<{
    latitude: number;
    longitude: number;
    order: number;
    roadId: string;
    address: string;
    elevation: number;
  }> = [];

  let created = 0;

  for (const route of routes) {
    const city = CITIES[(route.routeNumber - 1) % CITIES.length];

    const stopCount = stopsForRoute(route.routeNumber);

    for (let order = 1; order <= stopCount; order++) {
      const key = `${route.id}:${order}`;

      if (existingKeys.has(key)) {
        continue;
      }

      const latitude =
        city.latitude +
        (((route.routeNumber * 17 + order * 7) % 100) - 50) / 5000;

      const longitude =
        city.longitude +
        (((route.routeNumber * 23 + order * 11) % 100) - 50) / 5000;

      const elevation = 500 + ((route.routeNumber * 37 + order * 83) % 1200);

      const address =
        order === 1
          ? 'Start point'
          : order === stopCount
            ? 'Destination'
            : `Stop ${order}`;

      batch.push({
        latitude,
        longitude,
        order,
        roadId: route.id,
        address,
        elevation,
      });

      if (batch.length >= batchSize) {
        const { count } = await prisma.stop.createMany({
          data: batch,
        });

        created += count;
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    const { count } = await prisma.stop.createMany({
      data: batch,
    });

    created += count;
  }

  console.log(`Stops created: ${created}`);
}

async function createFavorites(
  users: Array<{
    id: string;
    email: string;
  }>,
): Promise<void> {
  const favoriteUsers = users.filter((user) =>
    ['test@test.com', 'test1@test.com', 'test2@test.com'].includes(user.email),
  );

  for (const user of favoriteUsers) {
    const road = await prisma.road.findFirst({
      where: {
        userId: user.id,
        title: {
          startsWith: 'Test Route ',
        },
      },
      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    if (!road) {
      continue;
    }

    const existingRoadFavorite = await prisma.favoriteRoad.findFirst({
      where: {
        userId: user.id,
        roadId: road.id,
      },
    });

    if (!existingRoadFavorite) {
      await prisma.favoriteRoad.create({
        data: {
          userId: user.id,
          roadId: road.id,
          title: `Favorite ${road.title}`,
          description: 'Demo favorite road',
        },
      });
    }

    const stop = await prisma.stop.findFirst({
      where: {
        roadId: road.id,
      },
      orderBy: {
        order: 'asc',
      },
    });

    if (!stop) {
      continue;
    }

    const existingStopFavorite = await prisma.favoriteStop.findFirst({
      where: {
        userId: user.id,
        stopId: stop.id,
      },
    });

    if (!existingStopFavorite) {
      await prisma.favoriteStop.create({
        data: {
          userId: user.id,
          stopId: stop.id,
          title: 'Favorite Stop',
          description: 'Demo favorite stop',
        },
      });
    }
  }
}

async function printStatistics(): Promise<void> {
  const [
    users,
    auths,
    roads,
    stops,
    favoriteRoads,
    favoriteStops,
    permits,
    permissions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.manuelAuth.count(),
    prisma.road.count(),
    prisma.stop.count(),
    prisma.favoriteRoad.count(),
    prisma.favoriteStop.count(),
    prisma.permit.count(),
    prisma.permission.count(),
  ]);

  console.log('\n==============================');
  console.log('SEED COMPLETE');
  console.log('==============================');

  console.log(`Users:          ${users}`);

  console.log(`Manual Auth:    ${auths}`);

  console.log(`Routes:         ${roads}`);

  console.log(`Stops:          ${stops}`);

  console.log(`Favorite Roads: ${favoriteRoads}`);

  console.log(`Favorite Stops: ${favoriteStops}`);

  console.log(`Permits:        ${permits}`);

  console.log(`Permissions:    ${permissions}`);

  console.log('==============================');

  console.log('\nLogin accounts:');

  console.log('  test@test.com / Test1234');

  console.log('  test1@test.com / Test1234');

  console.log('  test2@test.com / Test1234');

  console.log('  ...');

  console.log(`  test${USER_COUNT - 1}@test.com / Test1234`);

  console.log('');
}

async function main(): Promise<void> {
  console.log('Starting database seed...\n');

  console.log('Creating permissions...');

  for (const name of PERMISSIONS) {
    await getOrCreatePermission(name);
  }

  console.log('Creating permits...');

  for (const permit of PERMITS) {
    await getOrCreatePermit(
      permit.name,
      permit.description,
      permit.permissions,
    );
  }

  console.log(`Creating ${USER_COUNT} users...`);

  const users = await createUsers();

  console.log(`Creating ${ROUTE_COUNT} routes...`);

  const routes = await createRoutes(users);

  const plannedStops = routes.reduce(
    (total, route) => total + stopsForRoute(route.routeNumber),
    0,
  );

  console.log(`Creating up to ${plannedStops} stops...`);

  await createStops(routes);

  console.log('Creating favorites...');

  await createFavorites(users);

  await printStatistics();
}

main()
  .catch((error) => {
    console.error('\nSeed failed:');

    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
