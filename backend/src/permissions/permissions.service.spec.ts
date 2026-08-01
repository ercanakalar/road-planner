import { BadRequestException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { PermissionsService } from './permissions.service';

const FIRST_PAGE = { limit: 50, offset: 0 };
const PERMIT_ID = '909c9b35-eec3-4afe-a21d-986682659f5a';
const PERMISSION_A = 'c3f1d2e4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const PERMISSION_B = 'd4e2f3a5-6b7c-4d8e-9f0a-1b2c3d4e5f60';

describe('PermissionsService', () => {
  let prisma: PrismaMock;
  let service: PermissionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PermissionsService(prisma as unknown as PrismaService);
  });

  describe('getPermits', () => {
    it('returns the list inside an envelope', async () => {
      prisma.permit.findMany.mockResolvedValue([{ id: PERMIT_ID }]);

      await expect(service.getPermits(FIRST_PAGE)).resolves.toMatchObject({
        status: 'success',
        data: [{ id: PERMIT_ID }],
      });
    });

    it('does not carry a message, so listing does not toast', async () => {
      prisma.permit.findMany.mockResolvedValue([]);

      expect(await service.getPermits(FIRST_PAGE)).not.toHaveProperty(
        'message',
      );
    });
  });

  describe('getPermitById', () => {
    it('envelopes the permit', async () => {
      prisma.permit.findUniqueOrThrow.mockResolvedValue({ id: PERMIT_ID });

      await expect(service.getPermitById(PERMIT_ID)).resolves.toMatchObject({
        data: { id: PERMIT_ID },
      });
    });

    it('throws for an unknown id rather than returning null', async () => {
      prisma.permit.findUniqueOrThrow.mockRejectedValue(new Error('P2025'));

      await expect(service.getPermitById(PERMIT_ID)).rejects.toThrow();
    });
  });

  describe('updatePermitById', () => {
    const permit = { id: PERMIT_ID, name: 'ADMIN', permissions: [] };

    it('updates the description', async () => {
      prisma.permit.update.mockResolvedValue(permit);

      await service.updatePermitById(PERMIT_ID, { description: 'Full access' });

      expect(prisma.permit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PERMIT_ID },
          data: { description: 'Full access' },
        }),
      );
    });

    it('replaces the permission set rather than adding to it', async () => {
      prisma.permission.count.mockResolvedValue(2);
      prisma.permit.update.mockResolvedValue(permit);

      await service.updatePermitById(PERMIT_ID, {
        permissionIds: [PERMISSION_A, PERMISSION_B],
      });

      expect(prisma.permit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            permissions: {
              set: [{ id: PERMISSION_A }, { id: PERMISSION_B }],
            },
          },
        }),
      );
    });

    it('revokes every permission when given an empty set', async () => {
      prisma.permit.update.mockResolvedValue(permit);

      await service.updatePermitById(PERMIT_ID, { permissionIds: [] });

      expect(prisma.permit.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { permissions: { set: [] } } }),
      );

      expect(prisma.permission.count).not.toHaveBeenCalled();
    });

    it('rejects a permission id that does not exist', async () => {
      prisma.permission.count.mockResolvedValue(1);

      await expect(
        service.updatePermitById(PERMIT_ID, {
          permissionIds: [PERMISSION_A, PERMISSION_B],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.permit.update).not.toHaveBeenCalled();
    });

    it('rejects a request that changes nothing', async () => {
      await expect(service.updatePermitById(PERMIT_ID, {})).rejects.toThrow(
        'No updatable fields were supplied',
      );
      expect(prisma.permit.update).not.toHaveBeenCalled();
    });

    it('verifies and updates in one transaction', async () => {
      prisma.permission.count.mockResolvedValue(1);
      prisma.permit.update.mockResolvedValue(permit);

      await service.updatePermitById(PERMIT_ID, {
        permissionIds: [PERMISSION_A],
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('never writes a name, which would silently revoke admin', async () => {
      prisma.permit.update.mockResolvedValue(permit);

      await service.updatePermitById(PERMIT_ID, { description: 'x' });

      const { data } = prisma.permit.update.mock.calls[0][0];
      expect(data).not.toHaveProperty('name');
    });
  });

  describe('givePermit', () => {
    it('names the permit in its message', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        firstName: 'Ada',
        permit: { id: PERMIT_ID, name: 'ADMIN' },
      });

      await expect(
        service.givePermit({ userId: 'user-1', permitId: PERMIT_ID }),
      ).resolves.toMatchObject({
        message: 'Ada now holds the ADMIN permit',
      });
    });

    it('does not return the user row wholesale', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        firstName: 'Ada',
        permit: null,
      });

      await service.givePermit({ userId: 'user-1', permitId: PERMIT_ID });

      const { select } = prisma.user.update.mock.calls[0][0];
      expect(Object.keys(select)).toEqual(['id', 'firstName', 'permit']);
    });
  });
});
