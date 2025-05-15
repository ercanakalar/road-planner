import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.permission.createMany({
    data: [
      { name: 'ACCESS_DASHBOARD' },
      { name: 'MANAGE_USERS' },
      { name: 'DO_COMMENTS' },
      { name: 'CREATE_PRODUCT' },
      { name: 'APPROVE_PRODUCT' },
      { name: 'UPDATE_PRODUCT' },
    ],
    skipDuplicates: true,
  });

  await prisma.permit.create({
    data: {
      id: '909c9b35-eec3-4afe-a21d-986682659f5a',
      name: 'ADMIN',
      permissions: {
        connect: [
          { name: 'ACCESS_DASHBOARD' },
          { name: 'APPROVE_PRODUCT' },
          { name: 'MANAGE_USERS' },
          { name: 'UPDATE_PRODUCT' },
        ],
      },
    },
  });

  await prisma.permit.create({
    data: {
      id: '06542153-506c-4ab2-a276-11308e188deb',
      name: 'USER',
      permissions: {
        connect: [{ name: 'DO_COMMENTS' }],
      },
    },
  });
  await prisma.permit.create({
    data: {
      id: '9e4efa8f-1e44-47af-9ab2-e04d82e47868',
      name: 'SELLER',
      permissions: {
        connect: [{ name: 'CREATE_PRODUCT' }, { name: 'UPDATE_PRODUCT' }],
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
