import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import Container from 'components/ui/Container';
import useRefreshControlColors from 'hooks/useRefreshControlColors';
import ScreenState from 'components/ui/ScreenState';
import EditDetailsModal, { DetailsDraft } from 'components/road/EditDetailsModal';
import { useConfirm } from 'components/feedback/ConfirmProvider';
import { FavoriteSection } from './FavoriteSection';
import { FavoriteItem } from './FavoriteItem';

import {
  useGetFavoritesQuery,
  useToggleFavoriteRoadMutation,
  useToggleFavoriteWaypointMutation,
  useUpdateFavoriteAnnotationMutation,
} from 'store/services/favoriteService';
import { useAppSelector } from 'store/hook';
import { showNotification } from 'services/notificationService';

import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import {
  FavoriteEntry,
  FavoriteSectionKey,
} from 'types/store/services/favoriteService-type';
import {
  FavoriteSectionDescriptor,
  MaterialIconName,
} from 'types/screens/mapScreenType';
import { HomeTabParamList, RootStackParamList } from 'types/screens/screens';

const SECTIONS: {
  key: FavoriteSectionKey;
  title: string;
  icon: MaterialIconName;
}[] = [
  { key: 'ownRoads', title: 'My roads', icon: 'directions-car' },
  { key: 'ownWaypoints', title: 'My places', icon: 'location-on' },
  { key: 'othersRoads', title: "Others' roads", icon: 'public' },
  { key: 'othersWaypoints', title: "Others' places", icon: 'place' },
];

const HIGHLIGHT_MS = 4000;

const Favorite = () => {
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<HomeTabParamList, 'Favourites'>>();
  const confirm = useConfirm();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const [expanded, setExpanded] = useState<FavoriteSectionKey | null>(
    'ownRoads',
  );
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
    data: favorites,
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

  const toggleSection = useCallback((key: FavoriteSectionKey) => {
    setExpanded((previous) => (previous === key ? null : key));
  }, []);

  const handleEdit = useCallback((item: FavoriteEntry) => setEditing(item), []);

  const closeEditor = useCallback(() => setEditing(null), []);

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

  const sections = useMemo<FavoriteSectionDescriptor[]>(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        data: expanded === section.key ? (favorites?.[section.key] ?? []) : [],
      })),
    [expanded, favorites],
  );

  const totalCount = useMemo(
    () =>
      SECTIONS.reduce(
        (total, section) => total + (favorites?.[section.key]?.length ?? 0),
        0,
      ),
    [favorites],
  );

  const renderSectionHeader = useCallback(
    ({
      section,
    }: {
      section: SectionListData<FavoriteEntry, FavoriteSectionDescriptor>;
    }) => (
      <FavoriteSection
        section={{ ...section, data: favorites?.[section.key] ?? [] }}
        isExpanded={expanded === section.key}
        onToggle={toggleSection}
      />
    ),
    [expanded, favorites, toggleSection],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<FavoriteEntry>) => (
      <FavoriteItem
        item={item}
        isHighlighted={item.targetId === highlighted}
        onPress={handleItemPress}
        onEdit={handleEdit}
        onRemove={handleRemove}
      />
    ),
    [handleEdit, handleItemPress, handleRemove, highlighted],
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
    ) : !favorites && isError ? (
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
    ) : (
      <SectionList<FavoriteEntry, FavoriteSectionDescriptor>
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        SectionSeparatorComponent={SectionSpacer}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
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
        <View style={styles.header}>
          <Text style={styles.title}>Favourites</Text>
          <Text style={styles.subtitle}>
            {totalCount === 0
              ? 'Nothing saved yet'
              : `${totalCount} saved item${totalCount === 1 ? '' : 's'}`}
          </Text>
        </View>

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

const SectionSpacer = () => {
  const styles = useThemedStyles(createStyles);

  return <View style={styles.sectionSpacer} />;
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: 2,
      width: '100%',
    },
    title: {
      width: '100%',
      textAlign: 'center',
      ...typography.display,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xxl,
      gap: spacing.xxs,
    },
    sectionSpacer: {
      height: spacing.lg,
    },
  });

export default Favorite;
