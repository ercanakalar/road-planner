import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';

import {
  TrackedRequest,
  USAGE_TRACKING_METADATA_KEY,
  UsageTracking,
} from './track-usage.decorator';
import { UsageRecorder } from './usage.recorder';
import { ViewerResolver } from './viewer.resolver';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UsageInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly recorder: UsageRecorder,
    private readonly viewers: ViewerResolver,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const tracking = this.reflector.get<UsageTracking | undefined>(
      USAGE_TRACKING_METADATA_KEY,
      context.getHandler(),
    );

    if (!tracking) return next.handle();

    const request = context.switchToHttp().getRequest<TrackedRequest>();

    return next
      .handle()
      .pipe(tap((response) => void this.track(tracking, request, response)));
  }

  private async track(
    tracking: UsageTracking,
    request: TrackedRequest,
    response: unknown,
  ): Promise<void> {
    try {
      const event =
        typeof tracking.event === 'function'
          ? tracking.event(request)
          : tracking.event;

      if (!event) return;

      const subject = tracking.subject?.(response);
      const userId =
        typeof subject === 'string' && subject
          ? subject
          : await this.viewers.userIdOf(request);

      const detail = tracking.detail?.(request);

      this.recorder.record(event, {
        userId,
        detail: typeof detail === 'string' ? detail : null,
      });
    } catch (error) {
      this.logger.warn(
        `Could not work out usage for a tracked call: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
