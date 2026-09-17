import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';

import { ToastType } from 'src/common/type/status.type';
import { Phrase } from 'src/common/http/api-response';
import { translatePhrase } from 'src/common/interceptors/response-envelope.interceptor';
import { resolveAcceptLanguage } from 'src/i18n/languages';

/**
 * Everything below is a translation key rather than a sentence. A message that
 * arrives from a thrown `HttpException` is left as it is and resolves to
 * itself, so a corner of the API still throwing English keeps working.
 */
const STATUS_HEADERS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'error.invalidRequest',
  [HttpStatus.UNAUTHORIZED]: 'error.notSignedIn',
  [HttpStatus.FORBIDDEN]: 'error.notAllowed',
  [HttpStatus.NOT_FOUND]: 'error.notFoundHeader',
  [HttpStatus.CONFLICT]: 'error.conflict',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'error.tooLarge',
  [HttpStatus.TOO_MANY_REQUESTS]: 'error.slowDown',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'error.somethingWentWrongHeader',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'error.temporarilyUnavailable',
};

const PRISMA_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  P2000: {
    status: HttpStatus.BAD_REQUEST,
    message: 'error.valueTooLong',
  },
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'error.valueTaken',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'error.referenceMissing',
  },
  P2011: {
    status: HttpStatus.BAD_REQUEST,
    message: 'error.valueMissing',
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    message: 'error.breaksRelation',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: 'error.recordGone',
  },
};

const SQLSTATE_ERRORS: Record<string, { status: HttpStatus; message: string }> =
  {
    '23505': {
      status: HttpStatus.CONFLICT,
      message: 'error.valueTaken',
    },
    '23503': {
      status: HttpStatus.BAD_REQUEST,
      message: 'error.referenceMissing',
    },
    '23502': {
      status: HttpStatus.BAD_REQUEST,
      message: 'error.valueMissing',
    },
    '23514': {
      status: HttpStatus.BAD_REQUEST,
      message: 'error.valueNotAllowed',
    },
  };

/**
 * What Multer refuses an upload for, and what the caller should be told.
 *
 * Recognised by shape rather than by `instanceof`: Multer arrives through
 * `@nestjs/platform-express` rather than as a dependency of ours, so importing
 * its error class here would pin a transitive version. Left unmapped these
 * reach the client as a 500, which reads as a broken server rather than as a
 * photo that is too big.
 */
const MULTER_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  LIMIT_FILE_SIZE: {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    message: 'error.fileTooLarge',
  },
  LIMIT_UNEXPECTED_FILE: {
    status: HttpStatus.BAD_REQUEST,
    message: 'error.fileWrongField',
  },
  LIMIT_FILE_COUNT: {
    status: HttpStatus.BAD_REQUEST,
    message: 'error.fileTooMany',
  },
};

const MULTER_FALLBACK = {
  status: HttpStatus.BAD_REQUEST,
  message: 'error.uploadUnreadable',
};

function multerFailure(
  exception: unknown,
): { status: HttpStatus; message: string; code: string } | undefined {
  if (!(exception instanceof Error) || exception.name !== 'MulterError') {
    return undefined;
  }

  const code = String((exception as { code?: unknown }).code ?? 'UNKNOWN');

  return { ...(MULTER_ERRORS[code] ?? MULTER_FALLBACK), code };
}

interface Described {
  status: number;
  body: Record<string, unknown>;
  logDetail?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly i18n: Pick<I18nService, 'translate'>) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body, logDetail } = this.describe(exception);

    this.log(status, request, exception, logDetail);

    const language = resolveAcceptLanguage(
      request.headers?.['accept-language'],
    );
    const say = (phrase: Phrase | undefined) =>
      translatePhrase(phrase, language, this.i18n);

    // Validation errors arrive as an array of sentences; each is translated on
    // its own so one unrecognised key does not swallow the rest.
    const message = Array.isArray(body.message)
      ? (body.message as Phrase[]).map(say)
      : say(body.message as Phrase | undefined);

    response.status(status).json({
      status: ToastType.Error,
      header: say(STATUS_HEADERS[status] ?? 'error.genericHeader'),
      ...body,
      ...(message === undefined ? {} : { message }),
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

    const multer = multerFailure(exception);
    if (multer) {
      return {
        status: multer.status,
        body: { message: multer.message },
        logDetail: `Multer ${multer.code}: ${messageOf(exception)}`,
      };
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
        body: { message: 'error.serviceUnavailable' },
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
      body: { message: 'error.unexpected' },
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
