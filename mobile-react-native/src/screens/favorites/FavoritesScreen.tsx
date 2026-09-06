import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  View,
} from 'react-native';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import Container from 'components/ui/Container';
import ScreenHeader from 'components/ui/ScreenHeader';
import ScreenState from 'components/ui/ScreenState';
import EditDetailsModal, { DetailsDraft } from 'components/road/EditDetailsModal';
import { useConfirm } from 'components/feedback/ConfirmProvider';
import useCopyAddress from 'hooks/useCopyAddress';
import useRefreshControlColors from 'hooks/useRefreshControlColors';
import { FavoriteSection } from './FavoriteSection';
import { FavoriteItem } from './FavoriteItem';
import FavoritesSearch from './FavoritesSearch';
import { countFavorites, searchFavorites } from './searchFavorites';
import { buildSections } from './sections';

import {
  useGetFavoritesQuery,
  useToggleFavoriteRoadMutation,
  useToggleFavoriteWaypointMutation,
  useUpdateFavoriteAnnotationMutation,
} from 'store/services/favoriteService';
import { EMPTY_FAVORITES } from 'store/adapters/favoriteAdapter';
import { useAppSelector } from 'store/hook';
import { showNotification } from 'services/notificationService';

import { radius, spacing, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import {
  FavoriteEntry,
  FavoriteSectionKey,
} from 'types/store/services/favoriteService-type';
import { FavoriteSectionDescriptor } from 'types/screens/mapScreenType';
import { HomeTabParamList, RootStackParamList } from 'types/screens/screens';

const HIGHLIGHT_MS = 4000;

/**
 * Below this, everything fits on a screen or two and a search field is one
 * more thing between you and it.
 */
const SEARCHABLE_FROM = 8;

const FavoritesScreen = () => {
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<HomeTabParamList, 'Favourites'>>();
  const confirm = useConfirm();
  const copyAddress = useCopyAddress();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  // Sections start open and are collapsed one at a time, so "My roads" and
  // "My places" can be read together — the pairing most of this screen is for.
  const [collapsed, setCollapsed] = useState<readonly FavoriteSectionKey[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<FavoriteEntry | null>(null);

  const highlightTargetId = route.params?.highlightTargetId;
  const [highlighted, setHighlighted] = useState<string | undefined>(
    highlightTargetId,
  );

  useEffect(() => {
    if (!highlightTargetId) return;

    setHighlighted(highlightTargetId);
    const timer = setTimeout(() => setHighlighted(undefined), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightTargetId]);

  const {
    data: favorites = EMPTY_FAVORITES,
    isLoading,
    isFetching,
    isError,
    isUninitialized,
    refetch,
  } = useGetFavoritesQuery(undefined, { skip: !isLoggedIn });

  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();
  const [toggleFavoriteWaypoint] = useToggleFavoriteWaypointMutation();
  const [updateAnnotation, { isLoading: isSavingAnnotation }] =
    useUpdateFavoriteAnnotationMutation();

  const isSearching = query.trim().length > 0;

  const matches = useMemo(
    () => searchFavorites(favorites, query),
    [favorites, query],
  );

  const totalCount = useMemo(() => countFavorites(favorites), [favorites]);
  const matchCount = useMemo(() => countFavorites(matches), [matches]);

  const isExpanded = useCallback(
    // A search that hid its own results would look broken, so searching opens
    // everything it matched.
    (key: FavoriteSectionKey) => isSearching || !collapsed.includes(key),
    [collapsed, isSearching],
  );

  const toggleSection = useCallback((key: FavoriteSectionKey) => {
    setCollapsed((previous) =>
      previous.includes(key)
        ? previous.filter((candidate) => candidate !== key)
        : [...previous, key],
    );
  }, []);

  const clearSearch = useCallback(() => setQuery(''), []);

  const handleEdit = useCallback((item: FavoriteEntry) => setEditing(item), []);

  const closeEditor = useCallback(() => setEditing(null), []);

  const handleCopyAddress = useCallback(
    (item: FavoriteEntry) => {
      void copyAddress(item.address);
    },
    [copyAddress],
  );

  const handleSaveAnnotation = useCallback(
    async ({ title, description }: DetailsDraft) => {
      if (!editing) return;
      try {
        await updateAnnotation({
          favoriteId: editing.favoriteId,
          kind: editing.kind,
          title,
          description,
        }).unwrap();
        setEditing(null);
      } catch {
        showNotification({
          type: 'error',
          header: 'Could not save',
          message: 'Your changes were not applied.',
        });
      }
    },
    [editing, updateAnnotation],
  );

  const handleRemove = useCallback(
    async (item: FavoriteEntry) => {
      const confirmed = await confirm({
        title: 'Remove favourite',
        message: `“${item.title}” will be removed from your favourites.`,
        confirmLabel: 'Remove',
        icon: 'star-outline',
        tone: 'danger',
      });
      if (!confirmed) return;

      try {
        if (item.kind === 'road') {
          await toggleFavoriteRoad({ roadId: item.targetId }).unwrap();
        } else {
          await toggleFavoriteWaypoint({
            waypointId: item.targetId,
          }).unwrap();
        }
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Could not remove that favourite.',
        });
      }
    },
    [confirm, toggleFavoriteRoad, toggleFavoriteWaypoint],
  );

  const handleItemPress = useCallback(
    (item: FavoriteEntry) => {
      if (item.kind === 'road') {
        if (item.isOwn) {
          navigation.navigate('ShowRouteByIdScreen', { roadId: item.targetId });
        } else {
          navigation.navigate('CommunityRouteScreen', {
            roadId: item.targetId,
            title: item.title,
          });
        }
      } else {
        navigation.navigate('ShowWaypointById', { waypointId: item.targetId });
      }
    },
    [navigation],
  );

  const sections = useMemo(
    () => buildSections(matches, isExpanded),
    [isExpanded, matches],
  );

  const renderSectionHeader = useCallback(
    ({
      section,
    }: {
      section: SectionListData<FavoriteEntry, FavoriteSectionDescriptor>;
    }) => (
      <FavoriteSection
        section={section}
        isExpanded={isExpanded(section.key)}
        onToggle={toggleSection}
      />
    ),
    [isExpanded, toggleSection],
  );

  const renderSectionFooter = useCallback(
    ({
      section,
    }: {
      section: SectionListData<FavoriteEntry, FavoriteSectionDescriptor>;
    }) => (section.data.length > 0 ? <View style={styles.cardFoot} /> : null),
    [styles.cardFoot],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<FavoriteEntry>) => (
      <FavoriteItem
        item={item}
        isHighlighted={item.targetId === highlighted}
        onPress={handleItemPress}
        onEdit={handleEdit}
        onRemove={handleRemove}
        onCopyAddress={handleCopyAddress}
      />
    ),
    [handleCopyAddress, handleEdit, handleItemPress, handleRemove, highlighted],
  );

  const keyExtractor = useCallback(
    (item: FavoriteEntry) => item.favoriteId,
    [],
  );

  if (!isLoggedIn) {
    return (
      <Container>
        <ScreenState
          variant='empty'
          icon='lock-closed-outline'
          title='Sign in to keep favourites'
          message='Star a route or a stop and it will be waiting here on any device.'
        />
      </Container>
    );
  }

  const body =
    isLoading || isUninitialized ? (
      <ScreenState variant='loading' title='Loading favourites…' />
    ) : isError && totalCount === 0 ? (
      <ScreenState
        variant='error'
        title='Could not load favourites'
        message='Check your connection and try again.'
        actionLabel='Retry'
        onAction={refetch}
      />
    ) : totalCount === 0 ? (
      <ScreenState
        variant='empty'
        icon='star-outline'
        title='Nothing saved yet'
        message='Star a route or a stop and it will show up here.'
      />
    ) : matchCount === 0 ? (
      <ScreenState
        variant='empty'
        icon='search-outline'
        title='No matches'
        message={`Nothing saved matches “${query.trim()}”.`}
        actionLabel='Clear search'
        onAction={clearSearch}
      />
    ) : (
      <SectionList<FavoriteEntry, FavoriteSectionDescriptor>
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            {...refreshColors}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    );

  return (
    <Container>
      <View style={styles.container}>
        <ScreenHeader
          title='Favourites'
          // With nothing saved, the empty state below already says so — and
          // says it better than a subtitle can.
          subtitle={
            isSearching
              ? `${matchCount} of ${totalCount} shown`
              : totalCount === 0
                ? undefined
                : `${totalCount} saved item${totalCount === 1 ? '' : 's'}`
          }
        />

        {totalCount >= SEARCHABLE_FROM ? (
          <FavoritesSearch value={query} onChange={setQuery} />
        ) : null}

        {body}
      </View>

      <EditDetailsModal
        visible={editing !== null}
        heading={editing?.kind === 'road' ? 'Rename route' : 'Rename place'}
        hint={`Only you see this label. The original is “${
          editing?.defaultTitle ?? ''
        }”. Clear the field to go back to it.`}
        initialTitle={editing?.annotationTitle}
        initialDescription={editing?.annotationDescription}
        titleLabel='Your label'
        requireTitle={false}
        isSaving={isSavingAnnotation}
        onSave={handleSaveAnnotation}
        onCancel={closeEditor}
      />
    </Container>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xxl,
    },
    // Rounds off the last row, so a header and its rows read as one card, and
    // holds the gap before the next section.
    cardFoot: {
      height: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomLeftRadius: radius.md,
      borderBottomRightRadius: radius.md,
      marginBottom: spacing.md,
    },
  });

export default FavoritesScreen;
