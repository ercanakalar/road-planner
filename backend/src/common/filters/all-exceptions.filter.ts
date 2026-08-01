import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import { ToastType } from 'src/common/type/status.type';

const STATUS_HEADERS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Invalid Request',
  [HttpStatus.UNAUTHORIZED]: 'Not Signed In',
  [HttpStatus.FORBIDDEN]: 'Not Allowed',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Too Large',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Slow Down',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Something Went Wrong',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Temporarily Unavailable',
};

const PRISMA_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  P2000: {
    status: HttpStatus.BAD_REQUEST,
    message: 'A supplied value is too long.',
  },
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'That value is already taken.',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'A referenced record does not exist.',
  },
  P2011: {
    status: HttpStatus.BAD_REQUEST,
    message: 'A required value was missing.',
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    message: 'That change would break a required relation.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: 'The requested record no longer exists.',
  },
};

const SQLSTATE_ERRORS: Record<string, { status: HttpStatus; message: string }> =
  {
    '23505': {
      status: HttpStatus.CONFLICT,
      message: 'That value is already taken.',
    },
    '23503': {
      status: HttpStatus.BAD_REQUEST,
      message: 'A referenced record does not exist.',
    },
    '23502': {
      status: HttpStatus.BAD_REQUEST,
      message: 'A required value was missing.',
    },
    '23514': {
      status: HttpStatus.BAD_REQUEST,
      message: 'A supplied value is not allowed.',
    },
  };

interface Described {
  status: number;
  body: Record<string, unknown>;
  logDetail?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body, logDetail } = this.describe(exception);

    this.log(status, request, exception, logDetail);

    response.status(status).json({
      status: ToastType.Error,
      header: STATUS_HEADERS[status] ?? 'Error',
      ...body,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private describe(exception: unknown): Described {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      const body =
        typeof payload === 'string'
          ? { message: payload }
          : { ...(payload as Record<string, unknown>) };

      return { status, body };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped =
        PRISMA_ERRORS[exception.code] ?? this.bySqlState(exception);

      if (mapped) {
        return {
          status: mapped.status,
          body: { message: mapped.message },
          logDetail: `Prisma ${exception.code}: ${exception.message}`,
        };
      }

      return {
        ...this.internal(),
        logDetail: `Unmapped Prisma ${exception.code}: ${exception.message}`,
      };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        ...this.internal(),
        logDetail: `Prisma validation error: ${exception.message}`,
      };
    }

    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: { message: 'The service is temporarily unavailable.' },
        logDetail: exception.message,
      };
    }

    return this.internal();
  }

  private bySqlState(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { status: HttpStatus; message: string } | undefined {
    const sqlState = (exception.meta as { code?: unknown } | undefined)?.code;

    return typeof sqlState === 'string' ? SQLSTATE_ERRORS[sqlState] : undefined;
  }

  private internal(): Described {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { message: 'An unexpected error occurred.' },
    };
  }

  private log(
    status: number,
    request: Request,
    exception: unknown,
    detail?: string,
  ): void {
    const line = `${status} ${request.method} ${request.url} — ${detail ?? messageOf(exception)}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        line,
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      this.logger.warn(line);
      return;
    }

    this.logger.debug(line);
  }
}

function messageOf(exception: unknown): string {
  if (exception instanceof Error) return exception.message;
  return String(exception);
}
