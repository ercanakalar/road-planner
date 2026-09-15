import { configureStore } from '@reduxjs/toolkit';

import authReducer from 'store/slices/authSlice';
import { notificationService } from './notificationService';

const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [notificationService.reducerPath]: notificationService.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(notificationService.middleware),
  });

const line = (id: string, isRead = false) => ({
  id,
  kind: 'ROUTE_PUBLISHED',
  isRead,
  createdAt: '2026-09-14T10:00:00.000Z',
  actor: { id: 'a1', displayName: 'ercan', photo: null },
  road: { id: 'r1', title: 'Coastal drive' },
  isOpenable: true,
});

const inbox = (
  items: ReturnType<typeof line>[],
  meta: Record<string, unknown> = {},
) =>
  new Response(
    JSON.stringify({
      status: 'success',
      data: items,
      meta: {
        total: items.length,
        limit: 30,
        offset: 0,
        hasMore: false,
        unread: items.filter((i) => !i.isRead).length,
        ...meta,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

const readInbox = (store: ReturnType<typeof makeStore>) =>
  notificationService.endpoints.getNotifications.select({ offset: 0 })(
    store.getState() as never,
  ).data;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getNotifications', () => {
  it('keeps the unread count the envelope carries alongside the rows', async () => {
    // The badge and the list come from one request. Asking twice would let
    // them disagree on screen.
    global.fetch = jest
      .fn()
      .mockResolvedValue(inbox([line('n1'), line('n2', true)])) as never;

    const store = makeStore();
    const pending = store.dispatch(
      notificationService.endpoints.getNotifications.initiate({ offset: 0 }),
    );
    const result = await pending;
    pending.unsubscribe();

    expect(result.data).toEqual(
      expect.objectContaining({ total: 2, hasMore: false, unread: 1 }),
    );
    expect(result.data?.items).toHaveLength(2);
  });

  it('treats an envelope with no meta as one complete page', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'success', data: [line('n1')] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as never;

    const store = makeStore();
    const pending = store.dispatch(
      notificationService.endpoints.getNotifications.initiate({ offset: 0 }),
    );
    const result = await pending;
    pending.unsubscribe();

    expect(result.data).toEqual(
      expect.objectContaining({ total: 1, hasMore: false, unread: 0 }),
    );
  });
});

describe('markNotificationsRead', () => {
  it('marks every row read on screen without re-reading the list', async () => {
    // The list is paged: invalidating it would answer at whatever page the
    // reader had scrolled to and leave everything above it looking unread.
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(inbox([line('n1'), line('n2')]))
      .mockResolvedValue(
        new Response(JSON.stringify({ status: 'success', data: { read: 2 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ) as never;

    const store = makeStore();
    const listing = store.dispatch(
      notificationService.endpoints.getNotifications.initiate({ offset: 0 }),
    );
    await listing;

    expect(readInbox(store)?.unread).toBe(2);

    await store.dispatch(
      notificationService.endpoints.markNotificationsRead.initiate(),
    );

    const after = readInbox(store);
    expect(after?.unread).toBe(0);
    expect(after?.items.every((row) => row.isRead)).toBe(true);

    listing.unsubscribe();
  });

  it('marks only the named row, and takes one off the count', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(inbox([line('n1'), line('n2')]))
      .mockResolvedValue(
        new Response(JSON.stringify({ status: 'success', data: { read: 1 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ) as never;

    const store = makeStore();
    const listing = store.dispatch(
      notificationService.endpoints.getNotifications.initiate({ offset: 0 }),
    );
    await listing;

    await store.dispatch(
      notificationService.endpoints.markNotificationsRead.initiate({
        id: 'n1',
      }),
    );

    const after = readInbox(store);
    expect(after?.items.find((r) => r.id === 'n1')?.isRead).toBe(true);
    expect(after?.items.find((r) => r.id === 'n2')?.isRead).toBe(false);
    expect(after?.unread).toBe(1);

    listing.unsubscribe();
  });

  it('puts the rows back when the write does not land', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(inbox([line('n1')]))
      .mockResolvedValue(
        new Response(JSON.stringify({ status: 'error' }), { status: 500 }),
      ) as never;

    const store = makeStore();
    const listing = store.dispatch(
      notificationService.endpoints.getNotifications.initiate({ offset: 0 }),
    );
    await listing;

    await store.dispatch(
      notificationService.endpoints.markNotificationsRead.initiate(),
    );

    const after = readInbox(store);
    expect(after?.items[0].isRead).toBe(false);
    expect(after?.unread).toBe(1);

    listing.unsubscribe();
  });
});
