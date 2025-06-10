import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MapScreenProps } from 'types/map-screen-type';

import Container from 'components/Container';
import { useGetOwnRoadsMutation } from 'store/services/roadService';
import { useAppSelector } from 'store/hook';

const MapScreen = ({ navigation }: MapScreenProps) => {
  const { accessToken } = useAppSelector((state) => state.auth);
  const [getOwnRoads, { data, isLoading }] = useGetOwnRoadsMutation();

  const routes = data?.data || [];

  useEffect(() => {
    getOwnRoads({ accessToken }).unwrap().catch(console.error);
  }, [accessToken]);

  return (
    <Container>
      <View style={styles.container}>
        <Text style={styles.heading}>My Routes</Text>

        {isLoading ? (
          <ActivityIndicator size='large' color='#007AFF' />
        ) : routes.length === 0 ? (
          <Text style={styles.emptyText}>
            You haven't created any routes yet.
          </Text>
        ) : (
          <FlatList
            data={routes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.routeCard}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc}>{item.description}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                      navigation.navigate('ShowRouteByIdScreen', {
                        routeId: item.id,
                      })
                    }
                  >
                    <Text style={styles.buttonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.editButton]}
                    onPress={() =>
                      navigation.navigate('EditWaypointScreen', {
                        routeId: item.id,
                      })
                    }
                  >
                    <Text style={styles.buttonText}>Edit</Text>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  desc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
  editButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default MapScreen;
