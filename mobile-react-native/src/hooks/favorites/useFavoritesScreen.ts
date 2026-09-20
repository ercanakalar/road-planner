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
import { useTranslation } from 'react-i18next';

const HIGHLIGHT_MS = 4000;

export const SEARCHABLE_FROM = 8;

export function useFavoritesScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<HomeTabParamList, 'Favourites'>>();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const copyAddress = useCopyAddress();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

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

  const tabCounts = useMemo(
    () => ({
      route: countFavorites(favorites, 'route'),
      stop: countFavorites(favorites, 'stop'),
    }),
    [favorites],
  );
  const matchCount = useMemo(() => countFavorites(matches, tab), [matches, tab]);

  const isExpanded = useCallback(
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
          header: t('toast.couldNotSave'),
          message: t('toast.changesNotApplied'),
        });
      }
    },
    [editing, t, updateAnnotation],
  );

  const handleRemove = useCallback(
    async (item: FavoriteEntry) => {
      const confirmed = await confirm({
        title: t('dialogs.removeFavouriteTitle'),
        message: t('dialogs.removeFavouriteMessage', { title: item.title }),
        confirmLabel: t('actions.remove'),
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
          header: t('toast.error'),
          message: t('toast.couldNotRemoveFavourite'),
        });
      }
    },
    [confirm, t, toggleFavoriteRoute, toggleFavoriteStop],
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
