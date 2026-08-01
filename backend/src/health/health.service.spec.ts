import { Logger, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let prisma: { $queryRaw: jest.Mock };
  let service: HealthService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    prisma = { $queryRaw: jest.fn() };
    service = new HealthService(prisma as unknown as PrismaService);
  });

  it('reports up when the database answers', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

    await expect(service.check()).resolves.toMatchObject({
      status: 'up',
      database: 'up',
    });
  });

  it('reports down when the database does not', async () => {
    prisma.$queryRaw.mockRejectedValue(
      new Error(`Can't reach database server`),
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'down',
      database: 'down',
    });
  });

  it('includes uptime', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    const report = await service.check();

    expect(report.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(report.uptime)).toBe(true);
  });

  it('issues a real query rather than reading a connection flag', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.check();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('logs the reason a check failed', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));

    await service.check();

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('ECONNREFUSED'),
    );
  });
});

describe('HealthController', () => {
  let health: { check: jest.Mock };
  let controller: HealthController;

  beforeEach(() => {
    health = { check: jest.fn() };
    controller = new HealthController(health as unknown as HealthService);
  });

  it('returns the report when everything is up', async () => {
    const report = {
      status: 'up' as const,
      uptime: 1,
      database: 'up' as const,
    };
    health.check.mockResolvedValue(report);

    await expect(controller.check()).resolves.toBe(report);
  });

  it('answers 503 when a dependency is down', async () => {
    health.check.mockResolvedValue({
      status: 'down',
      uptime: 1,
      database: 'down',
    });

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
