import { useCallback, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import ScreenState from 'components/ui/ScreenState';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useNotificationsScreen from 'hooks/notifications/useNotificationsScreen';

import { radius, spacing, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { AppNotification } from 'types/store/services/notificationService-type';
import { RootStackParamList } from 'types/screens/screens';
import NotificationRow from './NotificationRow';

type Props = { navigation: NavigationProp<RootStackParamList> };

const NotificationsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();

  const {
    notifications,
    hasMore,
    loadMore,
    isLoadingMore,
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
  } = useNotificationsScreen();

  // The two things this screen does that are not the list itself live in the
  // header bar, where they do not take a row from it.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          {notifications.length > 0 ? (
            <Pressable
              onPress={handleClear}
              disabled={isClearing}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.headerButtonPressed,
              ]}
              accessibilityRole='button'
              accessibilityLabel='Clear all notifications'
            >
              <Ionicons
                name='trash-outline'
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}

          <Pressable
            onPress={goToSettings}
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
            accessibilityRole='button'
            accessibilityLabel='Notification settings'
          >
            <Ionicons name='options-outline' size={20} color={colors.text} />
          </Pressable>
        </View>
      ),
    });
  }, [
    colors.text,
    colors.textMuted,
    goToSettings,
    handleClear,
    isClearing,
    navigation,
    notifications.length,
    styles,
  ]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>) => (
      <NotificationRow
        notification={item}
        onOpen={openNotification}
        onOpenActor={openActor}
      />
    ),
    [openActor, openNotification],
  );

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  if (!isLoggedIn) {
    return (
      <ScreenState
        variant='empty'
        icon='notifications-outline'
        title='Sign in to see notifications'
        message='Follow the people whose routes you want to hear about, and their new ones show up here.'
      />
    );
  }

  if (isLoading) {
    return <ScreenState variant='loading' title='Loading notifications…' />;
  }

  if (isError) {
    return (
      <ScreenState
        variant='error'
        title='Could not load your notifications'
        message='Check your connection and try again.'
        actionLabel='Retry'
        onAction={refetch}
      />
    );
  }

  const footer =
    isLoadingMore || hasMore ? (
      <View style={styles.footer}>
        {isLoadingMore ? <ActivityIndicator size='small' /> : null}
      </View>
    ) : null;

  return (
    <FlatList
      style={styles.list}
      data={notifications}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={
        notifications.length === 0 ? styles.emptyContent : styles.listContent
      }
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoadingMore}
          onRefresh={refresh}
          {...refreshColors}
        />
      }
      ListEmptyComponent={
        <ScreenState
          variant='empty'
          icon='notifications-outline'
          title='Nothing yet'
          message='Tap “Notify me” on somebody’s profile, and their next published route turns up here.'
        />
      }
      ListFooterComponent={footer}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
    />
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.background },
    listContent: {
      gap: spacing.sm,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    emptyContent: { flexGrow: 1 },
    footer: { paddingVertical: spacing.lg, alignItems: 'center' },
    headerActions: { flexDirection: 'row', gap: spacing.xs },
    headerButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    headerButtonPressed: { backgroundColor: colors.surfaceAlt },
  });

export default NotificationsScreen;
