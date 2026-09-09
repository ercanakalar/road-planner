import { useCallback } from 'react';
import {
  RefreshControl,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  View,
} from 'react-native';

import Container from 'components/ui/Container';
import ScreenHeader from 'components/ui/ScreenHeader';
import ScreenState from 'components/ui/ScreenState';
import SegmentedControl, { Segment } from 'components/ui/SegmentedControl';
import EditDetailsModal from 'components/route/EditDetailsModal';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useFavoritesScreen, {
  SEARCHABLE_FROM,
} from 'hooks/favorites/useFavoritesScreen';
import { FavoriteSection } from './FavoriteSection';
import { FavoriteItem } from './FavoriteItem';
import FavoritesSearch from './FavoritesSearch';

import { radius, spacing, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import {
  FavoriteEntry,
  FavoriteKind,
} from 'types/store/services/favoriteService-type';
import { FavoriteSectionDescriptor } from 'types/screens/mapScreenType';

// The design splits favourites in two before anything else: routes on one
// side, the places on them on the other. Yours and other people's stay as
// sections inside whichever is showing.
const TABS: readonly Segment<FavoriteKind>[] = [
  { value: 'route', label: 'Routes' },
  { value: 'stop', label: 'Places' },
] as const;

const FavoritesScreen = () => {
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();

  const {
    isLoggedIn,
    query,
    setQuery,
    searchTerm,
    isSearching,
    isFiltering,
    clearSearch,
    tab,
    setTab,
    tabCounts,
    sections,
    totalCount,
    matchCount,
    highlighted,
    isExpanded,
    toggleSection,
    isLoading,
    isFetching,
    isError,
    isUninitialized,
    refetch,
    editing,
    isSavingAnnotation,
    handleItemPress,
    handleEdit,
    closeEditor,
    handleSaveAnnotation,
    handleRemove,
    handleCopyAddress,
  } = useFavoritesScreen();

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
          message='Save a route or a stop and it will be waiting here on any device.'
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
        icon='heart-outline'
        title='Nothing saved yet'
        message='Save a route or a place and it will show up here.'
      />
    ) : isSearching && matchCount === 0 ? (
      <ScreenState
        variant='empty'
        icon='search-outline'
        title='No matches'
        message={`Nothing under ${
          tab === 'route' ? 'Routes' : 'Places'
        } matches “${searchTerm}”.`}
        actionLabel='Clear search'
        onAction={clearSearch}
      />
    ) : matchCount === 0 ? (
      <ScreenState
        variant='empty'
        icon={tab === 'route' ? 'map-outline' : 'location-outline'}
        title={
          tab === 'route' ? 'No saved routes yet' : 'No saved places yet'
        }
        message={
          tab === 'route'
            ? 'The heart on a route saves it here.'
            : 'The heart on a stop saves the place here.'
        }
      />
    ) : (
      <SectionList<FavoriteEntry, FavoriteSectionDescriptor>
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        stickySectionHeadersEnabled={false}
        // Dimmed while the list is still catching up with the search field, so
        // results that are one keystroke behind read as pending, not as wrong.
        style={isFiltering ? styles.stale : undefined}
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
              ? `${matchCount} of ${tabCounts[tab]} shown`
              : totalCount === 0
                ? undefined
                : `${tabCounts.route} route${
                    tabCounts.route === 1 ? '' : 's'
                  } · ${tabCounts.stop} place${
                    tabCounts.stop === 1 ? '' : 's'
                  }`
          }
        />

        {totalCount > 0 ? (
          <View style={styles.tabs}>
            <SegmentedControl
              segments={TABS}
              value={tab}
              onChange={setTab}
              accessibilityLabel='Show'
            />
          </View>
        ) : null}

        {totalCount >= SEARCHABLE_FROM ? (
          <FavoritesSearch value={query} onChange={setQuery} />
        ) : null}

        {body}
      </View>

      <EditDetailsModal
        visible={editing !== null}
        heading={editing?.kind === 'route' ? 'Rename route' : 'Rename place'}
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
    tabs: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xxl,
    },
    stale: { opacity: 0.6 },
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
