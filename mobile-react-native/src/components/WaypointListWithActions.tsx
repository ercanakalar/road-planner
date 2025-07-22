import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  Pressable,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useAppSelector } from 'store/hook';
import {
  useGetRoadByIdQuery,
  useUpdateRoadByIdMutation,
  useDeleteWaypointByRoadIdMutation,
} from 'store/services/roadService';
import {
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';

type Props = {
  routeId: string;
  style?: ViewStyle;
};

const WaypointListWithActions = ({ routeId, style }: Props) => {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [updateRoadById] = useUpdateRoadByIdMutation();
  const [deleteWaypoint] = useDeleteWaypointByRoadIdMutation();
  const { data, refetch } = useGetRoadByIdQuery({ accessToken, routeId });
  const road = data as WaypointWithAddressAndId;
  const [waypoints, setWaypoints] = useState<WaypointWithAddress[]>([]);

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

  const handleDelete = (id: string) => {
    deleteWaypoint({ accessToken, routeId, waypointId: id })
      .unwrap()
      .then(() => refetch());
  };

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<WaypointWithAddress>) => (
    <Pressable
      onLongPress={drag}
      disabled={isActive}
      style={[styles.card, isActive && styles.cardActive]}
    >
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.order}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.address?.address}</Text>
          <Text style={styles.subtitle}>
            {item.address?.district}, {item.address?.province}
          </Text>
          <Text style={styles.coordinates}>
            📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, style]}>
      <DraggableFlatList
        data={waypoints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => updateOrder(data)}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

export default WaypointListWithActions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardActive: {
    backgroundColor: '#e6f7ff',
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 28,
    height: 28,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1e1e1e',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
  },
  coordinates: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  deleteButton: {
    padding: 6,
    marginLeft: 12,
  },
  deleteText: {
    fontSize: 18,
    color: '#ff3b30',
  },
});
