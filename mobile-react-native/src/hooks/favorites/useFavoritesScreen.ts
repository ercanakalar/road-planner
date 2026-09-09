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
  useToggleFavoriteRouteMutation,
  useToggleFavoriteStopMutation,
  useUpdateFavoriteAnnotationMutation,
} from 'store/services/favoriteService';
import type { DetailsDraft } from 'types/components/editDetailsModal';
import {
  FavoriteEntry,
  FavoriteKind,
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

  // Sections start open and are collapsed one at a time, so "My routes" and
  // "My places" can be read together — the pairing most of this screen is for.
  const [collapsed, setCollapsed] = useState<readonly FavoriteSectionKey[]>([]);
  const [tab, setTab] = useState<FavoriteKind>('route');
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

  const [toggleFavoriteRoute] = useToggleFavoriteRouteMutation();
  const [toggleFavoriteStop] = useToggleFavoriteStopMutation();
  const [updateAnnotation, { isLoading: isSavingAnnotation }] =
    useUpdateFavoriteAnnotationMutation();

  const isSearching = deferredQuery.trim().length > 0;

  const matches = useMemo(
    () => searchFavorites(favorites, deferredQuery),
    [favorites, deferredQuery],
  );

  const totalCount = useMemo(() => countFavorites(favorites), [favorites]);

  // Counted per tab as well as overall: an empty Stops tab with a full Routes
  // tab is a different thing from having saved nothing at all, and the two
  // deserve different empty states.
  const tabCounts = useMemo(
    () => ({
      route: countFavorites(favorites, 'route'),
      stop: countFavorites(favorites, 'stop'),
    }),
    [favorites],
  );
  const matchCount = useMemo(() => countFavorites(matches, tab), [matches, tab]);

  const isExpanded = useCallback(
    // A search that hid its own results would look broken, so searching opens
    // everything it matched.
    (key: FavoriteSectionKey) => isSearching || !collapsed.includes(key),
    [collapsed, isSearching],
  );

  const sections = useMemo(
    () => buildSections(matches, isExpanded, tab),
    [isExpanded, matches, tab],
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
        icon: 'heart-dislike-outline',
        tone: 'danger',
      });
      if (!confirmed) return;

      try {
        if (item.kind === 'route') {
          await toggleFavoriteRoute({ routeId: item.targetId }).unwrap();
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
    [confirm, toggleFavoriteRoute, toggleFavoriteStop],
  );

  const handleItemPress = useCallback(
    (item: FavoriteEntry) => {
      if (item.kind === 'stop') {
        navigation.navigate('ShowStopById', { stopId: item.targetId });
        return;
      }

      if (item.isOwn) {
        navigation.navigate('ShowRouteByIdScreen', { routeId: item.targetId });
        return;
      }

      navigation.navigate('CommunityRouteScreen', {
        routeId: item.targetId,
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
  };
}

export default useFavoritesScreen;
