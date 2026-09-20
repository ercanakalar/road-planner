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
    expect(ask({ unread: 0 })).toBe(false);
  });

  it('does not ask twice in one visit', () => {
    expect(ask({ hasAsked: true })).toBe(false);
  });
});
