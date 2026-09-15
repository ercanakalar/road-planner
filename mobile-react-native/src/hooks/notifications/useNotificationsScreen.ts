import { useCallback, useEffect, useRef } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import { SEARCH_PAGE_SIZE } from 'constants/pagination';
import useConfirm from 'hooks/feedback/useConfirm';
import usePagedOffset from 'hooks/common/usePagedOffset';
import { useAppSelector } from 'store/hook';
import {
  EMPTY_NOTIFICATION_PAGE,
  useClearNotificationsMutation,
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
} from 'store/services/notificationService';
import { AppNotification } from 'types/store/services/notificationService-type';
import { RootStackParamList } from 'types/screens/screens';

/**
 * Whether opening the screen should mark the inbox read yet.
 *
 * `hasAsked` is what stops it looping. The write is optimistic, so a failure
 * puts the unread count back — which is the same state that started the write,
 * and without this the screen would sit retrying a failing endpoint for as
 * long as it is open. Asking once a visit costs at most one unmarked row.
 */
export const shouldMarkRead = ({
  isLoading,
  unread,
  hasAsked,
}: {
  isLoading: boolean;
  unread: number;
  hasAsked: boolean;
}): boolean => !isLoading && unread > 0 && !hasAsked;

/**
 * The inbox.
 *
 * Opening it marks everything read, once, rather than per row: the screen is
 * the reading. A badge that survives having been looked at is the thing people
 * complain about.
 */
export function useNotificationsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const [offset, loadNextPage, resetPage] = usePagedOffset(
    'notifications',
    SEARCH_PAGE_SIZE,
  );

  const {
    data: page = EMPTY_NOTIFICATION_PAGE,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetNotificationsQuery({ offset }, { skip: !isLoggedIn });

  const [markRead] = useMarkNotificationsReadMutation();
  const [clearAll, { isLoading: isClearing }] = useClearNotificationsMutation();

  const hasMarked = useRef(false);

  // Marked once the first page has actually arrived, and only when there is
  // something to mark — otherwise every focus writes.
  useEffect(() => {
    if (
      !shouldMarkRead({
        isLoading,
        unread: page.unread,
        hasAsked: hasMarked.current,
      })
    ) {
      return;
    }

    hasMarked.current = true;
    markRead();
  }, [isLoading, markRead, page.unread]);

  const openNotification = useCallback(
    (notification: AppNotification) => {
      if (!notification.road || !notification.isOpenable) return;

      navigation.navigate('CommunityRouteScreen', {
        routeId: notification.road.id,
        title: notification.road.title,
      });
    },
    [navigation],
  );

  const openActor = useCallback(
    (notification: AppNotification) => {
      if (!notification.actor) return;

      navigation.navigate('AuthorScreen', {
        authorId: notification.actor.id,
        displayName: notification.actor.displayName,
      });
    },
    [navigation],
  );

  const loadMore = useCallback(() => {
    if (page.hasMore && !isFetching) loadNextPage();
  }, [isFetching, loadNextPage, page.hasMore]);

  /** Pulling down asks for the inbox as it is now, not for page four of it. */
  const refresh = useCallback(() => {
    // A deliberate pull is also the one safe place to try marking again: it is
    // the reader's own action, so it can neither spin nor surprise them.
    hasMarked.current = false;

    if (offset > 0) {
      resetPage();
      return;
    }
    refetch();
  }, [offset, refetch, resetPage]);

  const confirm = useConfirm();

  const handleClear = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Clear notifications',
      message: 'This removes every notification. It cannot be undone.',
      confirmLabel: 'Clear',
      icon: 'trash-outline',
      tone: 'danger',
    });

    if (confirmed) clearAll();
  }, [clearAll, confirm]);

  const goToSettings = useCallback(
    () => navigation.navigate('SettingsScreen'),
    [navigation],
  );

  return {
    notifications: page.items,
    total: page.total,
    hasMore: page.hasMore,
    loadMore,
    isLoadingMore: isFetching && page.items.length > 0,
    isLoading,
    isFetching,
    isError,
    refetch,
    refresh,
    isLoggedIn,
    isClearing,
    handleClear,
    openNotification,
    openActor,
    goToSettings,
  };
}

export default useNotificationsScreen;
