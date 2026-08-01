import { ExecutionContext } from '@nestjs/common';

export type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<R, A extends any[] ? A : any[]>
    : T[K];
};

const PRISMA_MODELS = [
  'user',
  'manuelAuth',
  'googleAuth',
  'session',
  'passwordReset',
  'permit',
  'permission',
  'road',
  'wayPoint',
  'addressInfo',
  'favoriteRoad',
  'favoriteWaypoint',
] as const;

const PRISMA_METHODS = [
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findMany',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
] as const;

export type PrismaMock = Record<
  (typeof PRISMA_MODELS)[number],
  Record<(typeof PRISMA_METHODS)[number], jest.Mock>
> & {
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
};

export function createPrismaMock(): PrismaMock {
  const mock = {} as PrismaMock;

  for (const model of PRISMA_MODELS) {
    mock[model] = PRISMA_METHODS.reduce(
      (methods, method) => ({ ...methods, [method]: jest.fn() }),
      {} as Record<(typeof PRISMA_METHODS)[number], jest.Mock>,
    );
  }

  mock.$transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: PrismaMock) => unknown)(mock)
      : Promise.all(arg as unknown[]),
  );

  mock.$queryRaw = jest.fn();
  mock.$executeRaw = jest.fn().mockResolvedValue(0);

  return mock;
}

export function createConfigMock(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      if (!(key in values)) throw new Error(`Missing config key: ${key}`);
      return values[key];
    }),
  };
}

export interface ExecutionContextOptions {
  user?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  handler?: object;
  controller?: object;
}

export function createExecutionContext(options: ExecutionContextOptions = {}): {
  context: ExecutionContext;
  request: Record<string, any>;
} {
  const request: Record<string, any> = {
    user: options.user,
    params: options.params ?? {},
    query: options.query ?? {},
    body: 'body' in options ? options.body : {},
    headers: options.headers ?? {},
    get: (name: string) => options.headers?.[name.toLowerCase()],
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => options.handler ?? function handler() {},
    getClass: () => options.controller ?? class Controller {},
    getType: () => 'http',
    getArgs: () => [request],
    getArgByIndex: () => request,
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
  } as unknown as ExecutionContext;

  return { context, request };
}
