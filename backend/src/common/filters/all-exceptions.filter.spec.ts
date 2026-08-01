import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common/interfaces';
import { Prisma } from '@prisma/client';

import { ToastType } from 'src/common/type/status.type';
import { AllExceptionsFilter } from './all-exceptions.filter';

const CLIENT_VERSION = '6.9.0';

const prismaKnown = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(
    `Query failed on table "User", column "email"`,
    { code, clientVersion: CLIENT_VERSION, meta: { target: ['email'] } },
  );

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    filter = new AllExceptionsFilter();
    json = jest.fn();
    status = jest.fn(() => ({ json }));

    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/road/abc', method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;
  });

  const body = () => json.mock.calls[0][0];

  describe('HttpException', () => {
    it.each([
      [new BadRequestException('bad'), 400, 'Invalid Request'],
      [new UnauthorizedException('nope'), 401, 'Not Signed In'],
      [new ForbiddenException('no'), 403, 'Not Allowed'],
      [new NotFoundException('gone'), 404, 'Not Found'],
      [new ConflictException('taken'), 409, 'Conflict'],
    ])('maps %s to %i', (exception, expected, header) => {
      filter.catch(exception, host);

      expect(status).toHaveBeenCalledWith(expected);
      expect(body()).toMatchObject({ status: ToastType.Error, header });
    });

    it('keeps the exception message', () => {
      filter.catch(new NotFoundException('Road not found'), host);

      expect(body().message).toBe('Road not found');
    });

    it('preserves a validation message array', () => {
      filter.catch(
        new BadRequestException([
          'email must be an email',
          'password too short',
        ]),
        host,
      );

      expect(body().message).toEqual([
        'email must be an email',
        'password too short',
      ]);
    });

    it('handles an exception whose response is a plain string', () => {
      filter.catch(new HttpException('teapot', 418), host);

      expect(status).toHaveBeenCalledWith(418);
      expect(body()).toMatchObject({ message: 'teapot', header: 'Error' });
    });
  });

  describe('Prisma errors', () => {
    it.each([
      ['P2002', HttpStatus.CONFLICT],
      ['P2025', HttpStatus.NOT_FOUND],
      ['P2003', HttpStatus.BAD_REQUEST],
      ['P2000', HttpStatus.BAD_REQUEST],
      ['P2011', HttpStatus.BAD_REQUEST],
      ['P2014', HttpStatus.BAD_REQUEST],
    ])('maps %s to %i', (code, expected) => {
      filter.catch(prismaKnown(code), host);

      expect(status).toHaveBeenCalledWith(expected);
    });

    it('does not echo table or column names to the client', () => {
      filter.catch(prismaKnown('P2002'), host);

      expect(JSON.stringify(body())).not.toMatch(/User|email|column/);
    });

    it('reports an unmapped Prisma code as a generic 500', () => {
      filter.catch(prismaKnown('P2037'), host);

      expect(status).toHaveBeenCalledWith(500);
      expect(body().message).toBe('An unexpected error occurred.');
    });

    describe('raw statement failures (P2010)', () => {
      const rawFailure = (sqlState: string) =>
        new Prisma.PrismaClientKnownRequestError('Raw query failed', {
          code: 'P2010',
          clientVersion: CLIENT_VERSION,
          meta: {
            code: sqlState,
            message: 'Key ("roadId", "order")=(road-1, 2) already exists.',
          },
        });

      it.each([
        ['23505', HttpStatus.CONFLICT],
        ['23503', HttpStatus.BAD_REQUEST],
        ['23502', HttpStatus.BAD_REQUEST],
        ['23514', HttpStatus.BAD_REQUEST],
      ])('maps SQLSTATE %s to %i', (sqlState, expected) => {
        filter.catch(rawFailure(sqlState), host);

        expect(status).toHaveBeenCalledWith(expected);
      });

      it('does not echo the offending key values', () => {
        filter.catch(rawFailure('23505'), host);

        expect(body().message).toBe('That value is already taken.');
        expect(JSON.stringify(body())).not.toMatch(/roadId|road-1/);
      });

      it('logs the SQLSTATE detail it withholds', () => {
        filter.catch(rawFailure('23505'), host);

        expect(Logger.prototype.debug).toHaveBeenCalledWith(
          expect.stringContaining('P2010'),
        );
      });

      it('falls back to a 500 for an unrecognised SQLSTATE', () => {
        filter.catch(rawFailure('42P01'), host);

        expect(status).toHaveBeenCalledWith(500);
      });

      it('falls back to a 500 when no SQLSTATE is carried', () => {
        filter.catch(
          new Prisma.PrismaClientKnownRequestError('Raw query failed', {
            code: 'P2010',
            clientVersion: CLIENT_VERSION,
          }),
          host,
        );

        expect(status).toHaveBeenCalledWith(500);
      });

      it('ignores a non-string SQLSTATE', () => {
        filter.catch(
          new Prisma.PrismaClientKnownRequestError('Raw query failed', {
            code: 'P2010',
            clientVersion: CLIENT_VERSION,
            meta: { code: 23505 },
          }),
          host,
        );

        expect(status).toHaveBeenCalledWith(500);
      });
    });

    it('reports a validation error as a 500 without its text', () => {
      filter.catch(
        new Prisma.PrismaClientValidationError(
          'Argument `where` of type UserWhereUniqueInput needs at least one argument',
          { clientVersion: CLIENT_VERSION },
        ),
        host,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(body().message).toBe('An unexpected error occurred.');
    });

    it('reports an unreachable database as 503', () => {
      filter.catch(
        new Prisma.PrismaClientInitializationError(
          `Can't reach database server at localhost:5432`,
          CLIENT_VERSION,
        ),
        host,
      );

      expect(status).toHaveBeenCalledWith(503);
      expect(body()).toMatchObject({ header: 'Temporarily Unavailable' });
    });
  });

  describe('unknown failures', () => {
    it.each([
      ['an Error', new Error('boom')],
      ['a string', 'boom'],
      ['null', null],
      ['an object', { boom: true }],
    ])('answers 500 for %s', (_label, thrown) => {
      filter.catch(thrown, host);

      expect(status).toHaveBeenCalledWith(500);
      expect(body().message).toBe('An unexpected error occurred.');
    });

    it('does not leak the underlying message', () => {
      filter.catch(new Error('ECONNREFUSED 10.0.0.5:5432'), host);

      expect(JSON.stringify(body())).not.toMatch(/10\.0\.0\.5|ECONNREFUSED/);
    });
  });

  describe('body shape', () => {
    it('reports the path and a timestamp', () => {
      filter.catch(new NotFoundException('gone'), host);

      expect(body()).toMatchObject({
        statusCode: 404,
        path: '/api/road/abc',
      });
      expect(Date.parse(body().timestamp)).not.toBeNaN();
    });

    it('always sets an error status, so a client can branch on the body alone', () => {
      filter.catch(new Error('boom'), host);

      expect(body().status).toBe(ToastType.Error);
    });
  });

  describe('logging', () => {
    it('logs a 500 with its stack', () => {
      const error = new Error('boom');

      filter.catch(error, host);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('500 GET /api/road/abc'),
        error.stack,
      );
    });

    it('logs the Prisma detail it withholds from the response', () => {
      filter.catch(prismaKnown('P2037'), host);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('P2037'),
        expect.anything(),
      );
    });

    it('warns on a 429, which is either abuse or a limit set too low', () => {
      filter.catch(new HttpException('Too many', 429), host);

      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('logs an ordinary 4xx at debug', () => {
      filter.catch(new UnauthorizedException('expired'), host);

      expect(Logger.prototype.debug).toHaveBeenCalled();
      expect(Logger.prototype.warn).not.toHaveBeenCalled();
      expect(Logger.prototype.error).not.toHaveBeenCalled();
    });
  });
});
