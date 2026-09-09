import { useCallback } from 'react';
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';

import Container from 'components/ui/Container';
import ScreenState from 'components/ui/ScreenState';
import RouteSummaryRow from 'components/route/RouteSummaryRow';
import SearchFilterBar from 'components/search/SearchFilterBar';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useAuthorScreen from 'hooks/search/useAuthorScreen';

import { radius, spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';
import { RouteSearchHit } from 'types/store/services/searchService-type';
import { resolvePhotoUrl } from 'utils/resolvePhotoUrl';

type Props = { route: RouteProp<RootStackParamList, 'AuthorScreen'> };

const AuthorScreen = ({ route }: Props) => {
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();

  const { authorId, displayName } = route.params;

  const {
    author,
    routes,
    order,
    setOrder,
    isLoading,
    isFetching,
    isError,
    refetch,
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
          : 'Published routes'}
      </Text>
    </View>
  );

  return (
    <Container>
      <View style={styles.container}>
        {header}

        <SearchFilterBar
          order={order}
          onOrderChange={setOrder}
          length='any'
          // Somebody's whole shelf is short enough to read; ordering it is
          // useful, narrowing it is not.
          onLengthChange={noop}
        />

        {isLoading ? (
          <ScreenState variant='loading' title='Loading routes…' />
        ) : isError ? (
          <ScreenState
            variant='error'
            title='Could not load these routes'
            message='Check your connection and try again.'
            actionLabel='Retry'
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
                refreshing={isFetching}
                onRefresh={refetch}
                {...refreshColors}
              />
            }
            ListEmptyComponent={
              <ScreenState
                variant='empty'
                icon='map-outline'
                title='Nothing published'
                message={`${name} has no public routes right now.`}
              />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
          />
        )}
      </View>
    </Container>
  );
};

const noop = () => undefined;

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
    listContent: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    emptyContent: { flexGrow: 1 },
  });

export default AuthorScreen;
