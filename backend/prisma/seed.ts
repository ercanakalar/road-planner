import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = ['ACCESS_DASHBOARD', 'MANAGE_USERS'] as const;

const PERMITS: Array<{
  name: string;
  description: string;
  permissions: string[];
}> = [
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
];

async function main(): Promise<void> {
  await prisma.permission.createMany({
    data: PERMISSIONS.map((name) => ({ name })),
    skipDuplicates: true,
  });

  for (const permit of PERMITS) {
    await prisma.permit.upsert({
      where: { name: permit.name },
      update: {
        description: permit.description,
        permissions: { set: permit.permissions.map((name) => ({ name })) },
      },
      create: {
        name: permit.name,
        description: permit.description,
        permissions: { connect: permit.permissions.map((name) => ({ name })) },
      },
    });
  }

  const permits = await prisma.permit.findMany({
    include: { permissions: true },
    orderBy: { name: 'asc' },
  });

  for (const permit of permits) {
    const granted = permit.permissions.map((p) => p.name).join(', ') || 'none';
    console.log(`  ${permit.name.padEnd(6)} -> ${granted}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
