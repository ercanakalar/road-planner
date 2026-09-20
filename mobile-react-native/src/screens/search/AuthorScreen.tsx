import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Container from 'components/ui/Container';
import ScreenState from 'components/ui/ScreenState';
import RouteSummaryRow from 'components/route/RouteSummaryRow';
import SearchFilterBar from 'components/search/SearchFilterBar';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useAuthorScreen from 'hooks/search/useAuthorScreen';

import {
  radius,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';
import { RouteSearchHit } from 'types/store/services/searchService-type';
import { resolvePhotoUrl } from 'utils/resolvePhotoUrl';
import { useTranslation } from 'react-i18next';

type Props = { route: RouteProp<RootStackParamList, 'AuthorScreen'> };

const AuthorScreen = ({ route }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const refreshColors = useRefreshControlColors();

  const { authorId, displayName } = route.params;

  const {
    author,
    routes,
    total,
    hasMore,
    loadMore,
    isLoadingMore,
    order,
    setOrder,
    length,
    setLength,
    isLoading,
    isFetching,
    isError,
    refetch,
    refresh,
    isFollowed,
    isUpdatingFollow,
    handleToggleFollow,
    isLoggedIn,
    handleToggleFavorite,
    openRoute,
  } = useAuthorScreen(authorId);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RouteSearchHit>) => (
      <RouteSummaryRow
        route={item}
        canFavorite={isLoggedIn}
        onOpen={openRoute}
        onToggleFavorite={handleToggleFavorite}
      />
    ),
    [handleToggleFavorite, isLoggedIn, openRoute],
  );

  const keyExtractor = useCallback((item: RouteSearchHit) => item.id, []);

  const name = author?.displayName ?? displayName ?? 'A traveller';
  const photo = resolvePhotoUrl(author?.photo);

  const header = (
    <View style={styles.header}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.meta}>
        {author
          ? `${author.publicRouteCount} published route${
              author.publicRouteCount === 1 ? '' : 's'
            }`
          : t('defaults.publishedRoutes')}
      </Text>

      <Pressable
        onPress={handleToggleFollow}
        style={({ pressed }) => [
          styles.follow,
          isFollowed && styles.followOn,
          pressed && styles.followPressed,
        ]}
        accessibilityRole='button'
        accessibilityState={{ selected: isFollowed, busy: isUpdatingFollow }}
        accessibilityLabel={
          isFollowed
            ? `Stop being notified when ${name} publishes a route`
            : `Notify me when ${name} publishes a route`
        }
        accessibilityHint={t('searchScreen.notifyHint')}
      >
        <Ionicons
          name={isFollowed ? 'notifications' : 'notifications-outline'}
          size={16}
          color={isFollowed ? colors.textInverse : colors.primary}
        />
        <Text style={[styles.followText, isFollowed && styles.followTextOn]}>
          {isFollowed
            ? t('searchScreen.notifyingYou')
            : t('defaults.notifyMe')}
        </Text>
      </Pressable>
    </View>
  );

  const footer =
    isLoadingMore || hasMore ? (
      <View style={styles.footer}>
        {isLoadingMore ? <ActivityIndicator size='small' /> : null}
      </View>
    ) : null;

  return (
    <Container>
      <View style={styles.container}>
        {header}

        <SearchFilterBar
          order={order}
          onOrderChange={setOrder}
          length={length}
          onLengthChange={setLength}
          summary={
            isLoading ? null : `${total} route${total === 1 ? '' : 's'}`
          }
          isSummaryStale={isFetching}
        />

        {isLoading ? (
          <ScreenState variant='loading' title={t('states.loadingRoutes')} />
        ) : isError ? (
          <ScreenState
            variant='error'
            title={t('searchScreen.authorErrorTitle')}
            message={t('states.checkConnection')}
            actionLabel={t('common.retry')}
            onAction={refetch}
          />
        ) : (
          <FlatList
            data={routes}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={
              routes.length === 0 ? styles.emptyContent : styles.listContent
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
                icon='map-outline'
                title={t('searchScreen.authorEmptyTitle')}
                message={
                  length === 'any'
                    ? t('searchScreen.authorNoPublic', { name })
                    : t('searchScreen.authorNoneOfLength', { name })
                }
              />
            }
            ListFooterComponent={footer}
            onEndReached={loadMore}
            onEndReachedThreshold={0.6}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
          />
        )}
      </View>
    </Container>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, gap: spacing.md },
    header: {
      alignItems: 'center',
      gap: spacing.xxs,
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceAlt,
    },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarText: {
      ...typography.title,
      color: colors.primary,
    },
    name: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 25,
      color: colors.text,
    },
    meta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    follow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    followOn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    followPressed: { opacity: 0.8 },
    followText: {
      ...typography.label,
      color: colors.primary,
    },
    followTextOn: { color: colors.textInverse },
    listContent: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    emptyContent: { flexGrow: 1 },
    footer: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
  });

export default AuthorScreen;
