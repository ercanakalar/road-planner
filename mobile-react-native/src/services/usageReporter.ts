import { API_BASE_URL } from 'constants/apiUrl';
import tokenStorage from 'services/tokenStorage';

// Features that run on the phone alone, so the server cannot count them
// itself. Mirrors CLIENT_USAGE_EVENTS on the server, which refuses any other.
export type ClientUsageEvent =
  | 'app_opened'
  | 'map_local_route_created'
  | 'map_google_import'
  | 'map_opened_in_google_maps'
  | 'travel_map_area_marked';

interface ReportedUsage {
  name: ClientUsageEvent;
  detail?: string;
}

// Short machine values only — a travel mode, an area kind — exactly what the
// server accepts, so a batch is never refused over one bad detail.
const DETAIL_PATTERN = /^[a-z0-9_.-]{1,32}$/;

const FLUSH_DELAY_MS = 2000;
const MAX_BATCH = 20;

let queue: ReportedUsage[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const send = async (events: ReportedUsage[]): Promise<void> => {
  const token = await tokenStorage.getAccessToken().catch(() => null);

  await fetch(`${API_BASE_URL}/statistics/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ events }),
  });
};

export const flushUsage = async (): Promise<void> => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  while (queue.length) {
    const batch = queue.slice(0, MAX_BATCH);
    queue = queue.slice(MAX_BATCH);

    // Statistics are best effort: a batch that does not get through is
    // dropped rather than retried, and nothing a person does waits on it.
    await send(batch).catch(() => undefined);
  }
};

export const reportUsage = (name: ClientUsageEvent, detail?: string): void => {
  queue.push({
    name,
    ...(detail && DETAIL_PATTERN.test(detail) ? { detail } : {}),
  });

  if (queue.length >= MAX_BATCH) {
    void flushUsage();
    return;
  }

  timer ??= setTimeout(() => {
    timer = null;
    void flushUsage();
  }, FLUSH_DELAY_MS);
};

// After consent is withdrawn nothing more is reported, not even what was
// still waiting to be sent.
export const discardPendingUsage = (): void => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  queue = [];
};

export default reportUsage;
