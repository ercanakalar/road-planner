import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { useAppDispatch, useAppSelector } from 'store/hook';
import { reOrder } from 'store/slices/roadSlice';

import { RoadState } from 'types/road';
import { Waypoint } from 'types/map-screen-type';

const DraggableList = () => {
  const dispatch = useAppDispatch();

  const waypoints = useAppSelector(
    (state: { road: RoadState }) => state.road.wayPoints
  );

  const [data, setData] = useState<Waypoint[]>(waypoints);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Waypoint>) => {
    return (
      <TouchableOpacity
        style={[
          styles.item,
          { backgroundColor: isActive ? 'green' : '#e0e0e0' },
        ]}
        onLongPress={drag}
      >
        <Text style={styles.addressText}>{item.address}</Text>
      </TouchableOpacity>
    );
  };

  const updateOrder = (data: Waypoint[]) => {
    const newOrder = data.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    return newOrder;
  };

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onDragEnd={({ data }) => {
          const updatedData = updateOrder(data);
          setData(updatedData);
          dispatch(reOrder(updatedData));
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
