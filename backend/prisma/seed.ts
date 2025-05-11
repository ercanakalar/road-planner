import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.permission.createMany({
    data: [{ name: 'ACCESS_DASHBOARD' }, { name: 'MANAGE_USERS' }],
    skipDuplicates: true,
  });

  await prisma.permit.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      permissions: {
        connect: [{ name: 'ACCESS_DASHBOARD' }, { name: 'MANAGE_USERS' }],
      },
    },
  });

  await prisma.permit.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      permissions: {
        connect: [],
      },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
