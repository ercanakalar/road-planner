import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  useToggleFavoriteRoadMutation,
  useToggleFavoriteWaypointMutation,
  useGetFavoritesQuery,
} from 'store/services/favoriteService';
import { FavoriteSection } from './FavoriteSection';
import {
  FavoriteItem,
  FavoriteWaypointWithRelation,
  GetAllFavorites,
} from 'types/screens/mapScreenType';
import { FavoriteRoadWithRelation } from 'types/store/services/favoriteService-type';
import { isFavoriteRoad } from 'utils/favoriteGuars';

const SECTIONS = [
  { key: 'ownRoads', title: 'My Roads', icon: 'directions-car' },
  { key: 'ownWaypoints', title: 'My Waypoints', icon: 'location-on' },
  { key: 'othersRoads', title: "Others' Roads", icon: 'public' },
  { key: 'othersWaypoints', title: "Others' Waypoints", icon: 'place' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

interface FavoriteProps {
  refreshToken?: number;
}

export default function Favorite({ refreshToken }: FavoriteProps) {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken) ?? '';

  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const hasMountedRef = useRef(false);

  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();
  const [toggleFavoriteWaypoint] = useToggleFavoriteWaypointMutation();

  const {
    data: favoritesData,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useGetFavoritesQuery({ accessToken }, { skip: !accessToken });

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    refetch();
  }, [refreshToken, refetch]);

  const handleRemoveFavorite = useCallback(
    async (item: FavoriteItem) => {
      try {
        if (isFavoriteRoad(item)) {
          await toggleFavoriteRoad({
            accessToken,
            roadId: item.id,
          }).unwrap();
        } else {
          await toggleFavoriteWaypoint({
            accessToken,
            waypointId: item.id,
          }).unwrap();
        }
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : 'Failed to remove favorite',
        );
        console.error('Failed to remove favorite:', err);
      }
    },
    [accessToken, toggleFavoriteRoad, toggleFavoriteWaypoint],
  );

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  }, []);

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        data: favoritesData?.data[s.key] ?? [],
      })),
    [favoritesData],
  );

  const error = localError ?? (fetchError ? 'Failed to fetch favorites' : null);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size='large' color='#2196F3' />
      </View>
    );
  }

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
            onItemPress={(fav) => {
              console.log(fav);
            }}
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
