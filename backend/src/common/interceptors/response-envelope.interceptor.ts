import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ApiEnvelope, isEnvelope, ok } from 'src/common/http/api-response';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiEnvelope> {
    return next.handle().pipe(map(toEnvelope));
  }
}

export function toEnvelope(value: unknown): ApiEnvelope {
  if (isEnvelope(value)) return value;

  if (value === undefined || value === null) return ok({ data: null });

  return ok({ data: value });
}
