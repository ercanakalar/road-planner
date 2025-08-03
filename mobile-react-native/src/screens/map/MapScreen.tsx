import React, { useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  MapScreenProps,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';

import Container from 'components/Container';
import { useAppSelector } from 'store/hook';
import {
  useDeleteRoadByIdMutation,
  useGetOwnRoadsQuery,
} from 'store/services/roadService';
import {
  useAddFavoriteRoadMutation,
  useRemoveFavoriteRoadMutation,
} from 'store/services/favoriteService';

const MapScreen = ({ navigation }: MapScreenProps) => {
  const { accessToken } = useAppSelector((state) => state.auth);

  const { data: roads, refetch } = useGetOwnRoadsQuery(
    { accessToken },
    { skip: !accessToken }
  ) as { data: WaypointWithAddressAndId[]; refetch: () => void };

  const [deleteRoadById, { isLoading }] = useDeleteRoadByIdMutation();
  const [addFavoriteRoad] = useAddFavoriteRoadMutation();
  const [removeFavoriteRoad] = useRemoveFavoriteRoadMutation();

  const handleDeleteRoad = async (roadId: string) => {
    if (!accessToken) return;
    await deleteRoadById({ accessToken, roadId }).unwrap();
    refetch();
  };

  const handleToggleFavorite = async (road: WaypointWithAddressAndId) => {
    if (!accessToken) return;
    const favorite = road.isFavorite;
    if (favorite) {
      await removeFavoriteRoad({
        accessToken,
        favoriteId: road.favorites[0].id,
      }).unwrap();
    } else {
      await addFavoriteRoad({
        accessToken,
        roadId: road.id,
      }).unwrap();
    }
    refetch();
  };

  useFocusEffect(
    useCallback(() => {
      if (accessToken) refetch?.();
    }, [accessToken, refetch])
  );

  return (
    <Container>
      <View style={styles.container}>
        <Text style={styles.heading}>My Routes</Text>

        {roads?.length === 0 ? (
          <Text style={styles.emptyText}>
            You haven't created any routes yet.
          </Text>
        ) : (
          <FlatList
            data={roads}
            refreshing={isLoading}
            onRefresh={refetch}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => (
              <View style={styles.routeCard}>
                <View style={styles.headerRow}>
                  <Text style={styles.title}>{item.title}</Text>
                  <TouchableOpacity
                    onPress={() => handleToggleFavorite(item)}
                    style={styles.favoriteButton}
                  >
                    <Text style={{ fontSize: 18 }}>
                      {item.isFavorite ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.desc}>{item.description}</Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                      navigation.navigate('ShowRouteByIdScreen', {
                        routeId: item.id,
                        accessToken: accessToken ?? '',
                      })
                    }
                  >
                    <Text style={styles.buttonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF3B30' }]}
                    onPress={() => handleDeleteRoad(item.id)}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#888',
  },
  routeCard: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  desc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default MapScreen;
