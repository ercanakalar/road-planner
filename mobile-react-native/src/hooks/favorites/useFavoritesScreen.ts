import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import useConfirm from 'hooks/feedback/useConfirm';
import useCopyAddress from 'hooks/common/useCopyAddress';
import { showNotification } from 'services/notificationService';
import { countFavorites, searchFavorites } from 'utils/favorites/searchFavorites';
import { buildSections } from 'utils/favorites/sections';
import { EMPTY_FAVORITES } from 'store/adapters/favoriteAdapter';
import { useAppSelector } from 'store/hook';
import {
  useGetFavoritesQuery,
  useToggleFavoriteRoadMutation,
  useToggleFavoriteStopMutation,
  useUpdateFavoriteAnnotationMutation,
} from 'store/services/favoriteService';
import type { DetailsDraft } from 'types/components/editDetailsModal';
import {
  FavoriteEntry,
  FavoriteSectionKey,
} from 'types/store/services/favoriteService-type';
import { HomeTabParamList, RootStackParamList } from 'types/screens/screens';

/** How long a favourite arrived at from elsewhere stays highlighted. */
const HIGHLIGHT_MS = 4000;

/**
 * Below this, everything fits on a screen or two and a search field is one
 * more thing between you and it.
 */
export const SEARCHABLE_FROM = 8;

/**
 * The favourites screen's state: what is saved, what the search matches, and
 * which row is being renamed or removed.
 *
 * Filtering runs against a deferred copy of the query, so typing stays at the
 * frame rate of the keyboard while re-filtering and re-sectioning a long list
 * happens at a lower priority behind it. `isFiltering` reports the gap.
 */
export function useFavoritesScreen() {
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

  const deferredQuery = useDeferredValue(query);
  const isFiltering = query !== deferredQuery;

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
  const [toggleFavoriteStop] = useToggleFavoriteStopMutation();
  const [updateAnnotation, { isLoading: isSavingAnnotation }] =
    useUpdateFavoriteAnnotationMutation();

  const isSearching = deferredQuery.trim().length > 0;

  const matches = useMemo(
    () => searchFavorites(favorites, deferredQuery),
    [favorites, deferredQuery],
  );

  const totalCount = useMemo(() => countFavorites(favorites), [favorites]);
  const matchCount = useMemo(() => countFavorites(matches), [matches]);

  const isExpanded = useCallback(
    // A search that hid its own results would look broken, so searching opens
    // everything it matched.
    (key: FavoriteSectionKey) => isSearching || !collapsed.includes(key),
    [collapsed, isSearching],
  );

  const sections = useMemo(
    () => buildSections(matches, isExpanded),
    [isExpanded, matches],
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
          await toggleFavoriteStop({
            stopId: item.targetId,
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
    [confirm, toggleFavoriteRoad, toggleFavoriteStop],
  );

  const handleItemPress = useCallback(
    (item: FavoriteEntry) => {
      if (item.kind === 'stop') {
        navigation.navigate('ShowStopById', { stopId: item.targetId });
        return;
      }

      if (item.isOwn) {
        navigation.navigate('ShowRouteByIdScreen', { roadId: item.targetId });
        return;
      }

      navigation.navigate('CommunityRouteScreen', {
        roadId: item.targetId,
        title: item.title,
      });
    },
    [navigation],
  );

  return {
    isLoggedIn,
    query,
    setQuery,
    // What the visible results were filtered by, which lags `query` by a frame
    // or two while a long list is re-filtered.
    searchTerm: deferredQuery.trim(),
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
  };
}

export default useFavoritesScreen;
