import tokenStorage from 'services/tokenStorage';
import {
  discardPendingUsage,
  flushUsage,
  reportUsage,
} from './usageReporter';

const sentBodies = () =>
  (global.fetch as jest.Mock).mock.calls.map(
    ([, init]) => JSON.parse((init as RequestInit).body as string).events,
  );

describe('usageReporter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(new Response('{}')) as never;
    jest.spyOn(tokenStorage, 'getAccessToken').mockResolvedValue(null);
    discardPendingUsage();
  });

  afterEach(() => {
    discardPendingUsage();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sends what happened together, after a pause', async () => {
    reportUsage('app_opened', 'android');
    reportUsage('travel_map_area_marked', 'city');

    expect(global.fetch).not.toHaveBeenCalled();

    await jest.runOnlyPendingTimersAsync();

    expect(sentBodies()).toEqual([
      [
        { name: 'app_opened', detail: 'android' },
        { name: 'travel_map_area_marked', detail: 'city' },
      ],
    ]);
  });

  it('posts to the statistics endpoint as the signed-in person', async () => {
    jest.spyOn(tokenStorage, 'getAccessToken').mockResolvedValue('token-1');

    reportUsage('map_google_import');
    await flushUsage();

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://api.test/api/statistics/events');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer token-1',
    });
  });

  it('sends nothing that identifies a signed-out person', async () => {
    reportUsage('map_google_import');
    await flushUsage();

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('drops a detail the server would refuse rather than lose the event', async () => {
    reportUsage('travel_map_area_marked', 'Kadıköy, İstanbul');
    await flushUsage();

    expect(sentBodies()).toEqual([[{ name: 'travel_map_area_marked' }]]);
  });

  it('never reports what was waiting when consent was withdrawn', async () => {
    reportUsage('app_opened');

    discardPendingUsage();
    await jest.runOnlyPendingTimersAsync();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shrugs off an unreachable server', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed')) as never;

    reportUsage('app_opened');

    await expect(flushUsage()).resolves.toBeUndefined();
  });

  it('splits a long run of events into batches the server accepts', async () => {
    for (let i = 0; i < 25; i += 1) reportUsage('app_opened');
    await flushUsage();

    expect(sentBodies().map((events) => events.length)).toEqual([20, 5]);
  });
});
