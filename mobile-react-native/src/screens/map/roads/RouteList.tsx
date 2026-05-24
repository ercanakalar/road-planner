import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import RouteCard from 'screens/map/roads/RouteCard';
import { RoutesListProps } from 'types/screens/mapScreenType';

const RoutesList: React.FC<RoutesListProps> = ({
  data,
  accessToken,
  isRefreshing,
  onRefresh,
  onToggleFavorite,
  onDelete,
  onView,
}) => {
  return (
    <FlatList
      data={data}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          You haven't created any routes yet.
        </Text>
      }
      renderItem={({ item }) => (
        <RouteCard
          item={item}
          accessToken={accessToken}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
          onView={onView}
        />
      )}
      scrollIndicatorInsets={{ right: 1 }}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#888',
  },
});

export default RoutesList;
