import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  useRemoveFavoriteRoadMutation,
  useRemoveFavoriteWaypointMutation,
  useGetFavoritesQuery,
} from 'store/services/favoriteService';
import { FavoriteSection } from './FavoriteSection';
import { FavoriteItem, GetAllFavorites } from 'types/screens/mapScreenType';

interface FavoriteProps {
  refreshToken?: number;
}

// ─────────────────────────────────────────────────────────────
// Static section definitions — defined outside component
// ─────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'ownRoads', title: 'My Roads', icon: 'directions-car' },
  { key: 'ownWaypoints', title: 'My Waypoints', icon: 'location-on' },
  { key: 'othersRoads', title: "Others' Roads", icon: 'public' },
  { key: 'othersWaypoints', title: "Others' Waypoints", icon: 'place' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function Favorite({ refreshToken = 0 }: FavoriteProps) {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken) ?? '';
  const hasMountedRef = useRef(false);

  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const [removeFavoriteRoad] = useRemoveFavoriteRoadMutation();
  const [removeFavoriteWaypoint] = useRemoveFavoriteWaypointMutation();

  const {
    data: favoritesData,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useGetFavoritesQuery({ accessToken }, { skip: !accessToken });

  // ── Optimistic remove ───────────────────────────────────────
  const handleRemoveFavorite = useCallback(
    async (item: FavoriteItem) => {
      if (!item.favoriteId) return;
      setLocalError(null);

      // const sectionKey: SectionKey =
      //   item.owner === 'own'
      //     ? item.type === 'road'
      //       ? 'ownRoads'
      //       : 'ownWaypoints'
      //     : item.type === 'road'
      //       ? 'othersRoads'
      //       : 'othersWaypoints';

      // const patch = dispatch(
      //   favoriteService.util.updateQueryData(
      //     'getFavorites',
      //     { accessToken },
      //     (draft) => {
      //       draft[sectionKey] = draft[sectionKey].filter(
      //         (f) => f.favoriteId !== item.favoriteId,
      //       );
      //     },
      //   ),
      // );

      try {
        if (item.type === 'road') {
          await removeFavoriteRoad({
            accessToken,
            favoriteId: item.favoriteId,
          }).unwrap();
        } else {
          await removeFavoriteWaypoint({
            accessToken,
            favoriteId: item.favoriteId,
          }).unwrap();
        }
      } catch (err) {
        // patch.undo();
        setLocalError(
          err instanceof Error ? err.message : 'Failed to remove favorite',
        );
        console.error('Failed to remove favorite:', err);
      }
    },
    [accessToken, dispatch, removeFavoriteRoad, removeFavoriteWaypoint],
  );

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  }, []);

  // ── Sections with live data ─────────────────────────────────
  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        data: ((favoritesData as GetAllFavorites)?.[s.key] ?? []),
      })),
    [favoritesData],
  );

  const error = localError ?? (fetchError ? 'Failed to fetch favorites' : null);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    refetch();
  }, [refreshToken, refetch]);

  // ── Loading state ───────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size='large' color='#2196F3' />
      </View>
    );
  }

  // ── Error state (no data at all) ────────────────────────────
  if (error && !favoritesData) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <FavoriteSection
            section={item}
            isExpanded={expandedSection === item.key}
            onToggle={() => toggleSection(item.key)}
            onRemove={handleRemoveFavorite}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor='#2196F3'
          />
        }
      />

      {/* {error && favoritesData && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffebee',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#d32f2f',
  },
  errorBannerText: { color: '#d32f2f', fontSize: 14, fontWeight: '600' },
});
