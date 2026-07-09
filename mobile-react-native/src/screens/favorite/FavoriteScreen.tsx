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
import { useAppSelector } from 'store/hook';
import {
  useGetFavoritesQuery,
} from 'store/services/favoriteService';
import { FavoriteSection } from './FavoriteSection';

import Container from 'components/Container';
import { useFocusEffect } from '@react-navigation/native';

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

export default function FavoriteScreen({ refreshToken }: FavoriteProps) {
  const accessToken = useAppSelector((state) => state.auth.accessToken) ?? '';

  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);

  const hasMountedRef = useRef(false);

  const {
    data: favoritesData,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useGetFavoritesQuery({ accessToken }, { skip: !accessToken });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    refetch();
  }, [refreshToken, refetch]);


  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  }, []);


  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        key: s.key,
        title: s.title,
        icon: s.icon,
        data: favoritesData?.[s.key] ?? [],
      })),
    [favoritesData],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size='large' color='#2196F3' />
      </View>
    );
  }


  if (!favoritesData) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>No favorites found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Container>
      <View style={styles.container}>
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <FavoriteSection
              section={item}
              isExpanded={expandedSection === item.key}
              onToggle={() => toggleSection(item.key)}
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
    </Container>
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
