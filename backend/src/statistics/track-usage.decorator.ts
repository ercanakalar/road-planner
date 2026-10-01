import { SetMetadata } from '@nestjs/common';

import { ServerUsageEvent } from './usage-events';

export const USAGE_TRACKING_METADATA_KEY = 'usageTracking';

export interface TrackedRequest {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  user?: { userId?: unknown };
  headers?: Record<string, unknown>;
}

export interface UsageTracking {
  // The event to count, or a function choosing it from the request — null
  // when this particular call is not worth counting.
  event:
    ServerUsageEvent | ((request: TrackedRequest) => ServerUsageEvent | null);

  // A short machine value narrowing the event down, e.g. the travel mode.
  detail?: (request: TrackedRequest) => unknown;

  // Whose usage it was, read from the response, for the endpoints that sign
  // someone in: the caller is anonymous until the response says who they are.
  subject?: (response: unknown) => unknown;
}

// Counts a successful call to the decorated endpoint in the statistics table.
// A call that throws is not counted.
export const TrackUsage = (tracking: ServerUsageEvent | UsageTracking) =>
  SetMetadata(
    USAGE_TRACKING_METADATA_KEY,
    typeof tracking === 'string' ? { event: tracking } : tracking,
  );

// The user id an auth endpoint returns in its envelope.
export const signedInUser = (response: unknown): unknown =>
  (response as { data?: { userId?: unknown } } | undefined)?.data?.userId;
