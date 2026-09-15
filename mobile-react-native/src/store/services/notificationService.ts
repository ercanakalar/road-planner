import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import { SEARCH_PAGE_SIZE } from 'constants/pagination';
import {
  appendPage,
  pagedCacheKey,
  refetchOnNewPage,
} from 'store/bases/paging';
import { transformApiResponse } from 'store/bases/transformApiResponse';
import { ApiResponse } from 'types/store/bases';
import {
  AppNotification,
  NotificationPage,
  NotificationPageArgs,
  NotificationSettings,
  NotificationSettingsPatch,
  UnreadCount,
} from 'types/store/services/notificationService-type';

/**
 * The inbox goes stale the moment somebody publishes, and there is no way for
 * the phone to be told — so it is re-read on focus and on reconnect rather than
 * held.
 */
const CACHE_SECONDS = 60;

const EMPTY: NotificationPage = {
  items: [],
  total: 0,
  hasMore: false,
  unread: 0,
};

/**
 * The envelope's `meta` carries the paging *and* the unread count, so the badge
 * and the list are one answer. Asking twice would let them disagree on screen.
 */
const toNotificationPage = (
  res: ApiResponse<AppNotification[]>,
): NotificationPage => {
  const items = res?.data ?? [];
  const meta = res?.meta as
    | { total?: number; hasMore?: boolean; unread?: number }
    | undefined;

  return {
    items,
    total: meta?.total ?? items.length,
    hasMore: meta?.hasMore ?? false,
    unread: meta?.unread ?? 0,
  };
};

export const notificationService = createApi({
  reducerPath: 'notificationService',
  baseQuery: baseQuery(),
  tagTypes: ['Notification', 'NotificationSettings'],
  keepUnusedDataFor: CACHE_SECONDS,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationPage, NotificationPageArgs>({
      query: ({ limit, offset } = {}) => ({
        url: '/notifications',
        method: 'GET',
        params: { limit: limit ?? SEARCH_PAGE_SIZE, offset: offset || undefined },
      }),
      transformResponse: toNotificationPage,
      serializeQueryArgs: pagedCacheKey,
      merge: (current, incoming, { arg }) => ({
        ...appendPage(current, incoming, arg.offset),
        // Always the newest answer: the count is about the whole inbox, not
        // about the page that happened to arrive.
        unread: incoming.unread,
      }),
      forceRefetch: refetchOnNewPage,
      providesTags: [{ type: 'Notification' as const, id: 'LIST' }],
    }),

    /** Just the number, for the badge on a screen that is not the inbox. */
    getUnreadCount: builder.query<number, void>({
      query: () => ({ url: '/notifications/unread-count', method: 'GET' }),
      transformResponse: (res: ApiResponse<UnreadCount>) =>
        transformApiResponse(res)?.unread ?? 0,
      providesTags: [{ type: 'Notification' as const, id: 'UNREAD' }],
    }),

    /**
     * Marks one line read, or the whole inbox when no id is given.
     *
     * The rows on screen are corrected immediately rather than re-fetched: the
     * list is paged, and invalidating it would answer at whatever page the
     * reader had scrolled to and leave everything above it looking unread.
     */
    markNotificationsRead: builder.mutation<unknown, { id?: string } | void>({
      query: (args) => ({
        url: args?.id
          ? `/notifications/${args.id}/read`
          : '/notifications/read',
        method: 'POST',
      }),
      async onQueryStarted(args, { dispatch, getState, queryFulfilled }) {
        const id = (args as { id?: string } | undefined)?.id;

        const patches = notificationService.util
          .selectCachedArgsForQuery(getState(), 'getNotifications')
          .map((cached) =>
            dispatch(
              notificationService.util.updateQueryData(
                'getNotifications',
                cached,
                (draft) => {
                  let marked = 0;

                  for (const row of draft.items) {
                    if (row.isRead || (id && row.id !== id)) continue;
                    row.isRead = true;
                    marked += 1;
                  }

                  draft.unread = id
                    ? Math.max(0, draft.unread - marked)
                    : 0;
                },
              ),
            ),
          );

        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
      // The badge is a number with nowhere to drift to, so it is re-read.
      invalidatesTags: [{ type: 'Notification' as const, id: 'UNREAD' }],
    }),

    clearNotifications: builder.mutation<unknown, void>({
      query: () => ({ url: '/notifications', method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Notification' as const, id: 'LIST' },
        { type: 'Notification' as const, id: 'UNREAD' },
      ],
    }),

    getNotificationSettings: builder.query<NotificationSettings, void>({
      query: () => ({ url: '/notifications/settings', method: 'GET' }),
      transformResponse: (res: ApiResponse<NotificationSettings>) =>
        transformApiResponse(res) ?? { inApp: true, email: true },
      providesTags: [{ type: 'NotificationSettings' as const, id: 'ME' }],
    }),

    updateNotificationSettings: builder.mutation<
      NotificationSettings,
      NotificationSettingsPatch
    >({
      query: (body) => ({
        url: '/notifications/settings',
        method: 'PATCH',
        body,
      }),
      transformResponse: (res: ApiResponse<NotificationSettings>) =>
        transformApiResponse(res),
      // A switch that waits for a round trip to move feels broken, and putting
      // it back is the honest thing to do when the write does not land.
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          notificationService.util.updateQueryData(
            'getNotificationSettings',
            undefined,
            (draft) => Object.assign(draft, patch),
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          undo.undo();
        }
      },
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationsReadMutation,
  useClearNotificationsMutation,
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
} = notificationService;

export { EMPTY as EMPTY_NOTIFICATION_PAGE };

export default notificationService;
