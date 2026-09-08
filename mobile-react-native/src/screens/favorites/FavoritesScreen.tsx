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
import EditDetailsModal from 'components/road/EditDetailsModal';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useFavoritesScreen, {
  SEARCHABLE_FROM,
} from 'hooks/favorites/useFavoritesScreen';
import { FavoriteSection } from './FavoriteSection';
import { FavoriteItem } from './FavoriteItem';
import FavoritesSearch from './FavoritesSearch';

import { radius, spacing, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { FavoriteEntry } from 'types/store/services/favoriteService-type';
import { FavoriteSectionDescriptor } from 'types/screens/mapScreenType';

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
        message={`Nothing saved matches “${searchTerm}”.`}
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
