import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { useAppSelector } from 'store/hook';
import {
  useGetRoadByIdQuery,
  useUpdateRoadByIdMutation,
} from 'store/services/roadService';
import {
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';

const DraggableList = ({ routeId }: { routeId: string }) => {
  const [updateRoadById] = useUpdateRoadByIdMutation();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const { data, refetch } = useGetRoadByIdQuery({ accessToken, routeId });

  const road = data as WaypointWithAddressAndId;
  const [waypoints, setWaypoints] = useState<WaypointWithAddress[]>(
    road?.wayPoints || []
  );

  if (!road)
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading route data...</Text>
      </View>
    );

  if (!road.wayPoints || road.wayPoints.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No waypoints available.</Text>
      </View>
    );
  }

  useEffect(() => {
    if (road?.wayPoints) {
      setWaypoints(road.wayPoints);
    }
  }, [road?.wayPoints]);

  const updateOrder = (newData: WaypointWithAddress[]) => {
    const newOrder = newData.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    setWaypoints(newOrder);
    updateRoadById({
      accessToken,
      routeId,
      title: road?.title,
      description: road?.description,
      waypoints: newOrder,
    })
      .unwrap()
      .then(() => refetch());
  };

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<WaypointWithAddress>) => (
    <TouchableOpacity
      onLongPress={drag}
      disabled={isActive}
      style={[
        styles.card,
        {
          backgroundColor: isActive ? '#dfffe0' : '#fff',
          shadowOpacity: isActive ? 0.15 : 0.05,
          transform: [{ scale: isActive ? 1.01 : 1 }],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.order}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.address?.address}</Text>
      </View>
      <Text style={styles.cardText}>
        {item.address?.district}, {item.address?.province}
      </Text>
      <Text style={styles.cardText}>
        📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={waypoints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => {
          updateOrder(data);
          setWaypoints(data);
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#555',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
  card: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 16,
    flex: 1,
    flexWrap: 'wrap',
  },
  cardText: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
  },
});

export default DraggableList;
