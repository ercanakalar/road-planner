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
import { useTranslation } from 'react-i18next';

export const shouldMarkRead = ({
  isLoading,
  unread,
  hasAsked,
}: {
  isLoading: boolean;
  unread: number;
  hasAsked: boolean;
}): boolean => !isLoading && unread > 0 && !hasAsked;

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

  const refresh = useCallback(() => {
    hasMarked.current = false;

    if (offset > 0) {
      resetPage();
      return;
    }
    refetch();
  }, [offset, refetch, resetPage]);

  const confirm = useConfirm();
  const { t } = useTranslation();

  const handleClear = useCallback(async () => {
    const confirmed = await confirm({
      title: t('notifications.clearTitle'),
      message: t('notifications.clearMessage'),
      confirmLabel: t('notifications.clearConfirm'),
      icon: 'trash-outline',
      tone: 'danger',
    });

    if (confirmed) clearAll();
  }, [clearAll, confirm, t]);

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
