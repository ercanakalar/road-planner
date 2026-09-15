import { shouldMarkRead } from './useNotificationsScreen';

const ask = (over: Partial<Parameters<typeof shouldMarkRead>[0]> = {}) =>
  shouldMarkRead({ isLoading: false, unread: 2, hasAsked: false, ...over });

describe('shouldMarkRead', () => {
  it('marks the inbox once the first page is on screen', () => {
    expect(ask()).toBe(true);
  });

  it('waits for the page rather than marking an inbox it has not read', () => {
    expect(ask({ isLoading: true })).toBe(false);
  });

  it('writes nothing when there is nothing unread', () => {
    // Otherwise every focus and every reconnect posts to say so.
    expect(ask({ unread: 0 })).toBe(false);
  });

  it('does not ask twice in one visit', () => {
    // The write is optimistic: a failure puts the unread count back, which is
    // the state that started it. Without this the screen retries a failing
    // endpoint for as long as it is open.
    expect(ask({ hasAsked: true })).toBe(false);
  });
});
