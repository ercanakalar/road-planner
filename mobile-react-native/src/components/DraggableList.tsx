import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { useAppSelector } from 'store/hook';
import { useGetRoadByIdQuery, useUpdateRoadByIdMutation } from 'store/services/roadService';

import { WaypointWithAddress, WaypointWithAddressAndId } from 'types/map-screen-type';

const DraggableList = ({ routeId }: { routeId: string }) => {
  const [updateRoadById] = useUpdateRoadByIdMutation();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const { data } = useGetRoadByIdQuery({ accessToken, routeId });

  const road = data as WaypointWithAddressAndId;

  const [waypoints, setWaypoints] = useState<WaypointWithAddress[]>(road?.wayPoints || []);

  useEffect(() => {
    if (road?.wayPoints) {
      setWaypoints(road.wayPoints);
    }
  }, [road?.wayPoints]);

  if (!road) return <View style={styles.container}><Text>Loading...</Text></View>;
  if (!waypoints || waypoints.length === 0) {
    return <View style={styles.container}><Text>No waypoints available.</Text></View>;
  }

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<WaypointWithAddress>) => (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: isActive ? 'green' : '#e0e0e0' },
      ]}
      onLongPress={drag}
    >
      <Text style={styles.addressText}>{item.address.address}</Text>
    </TouchableOpacity>
  );

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
    }).unwrap();
  };

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={waypoints}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          updateOrder(data);
          setWaypoints(data);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  item: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    borderColor: '#d3d3d3',
    borderWidth: 1,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
  },
});

export default DraggableList;
