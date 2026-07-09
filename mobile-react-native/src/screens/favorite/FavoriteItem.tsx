import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from 'store/hook';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { FavoriteItemType, FavoriteItemProps } from 'types/screens/mapScreenType';
import { isFavoriteRoad } from 'utils/favoriteGuars';
import { useToggleFavoriteRoadMutation, useToggleFavoriteWaypointMutation } from 'store/services/favoriteService';

export const FavoriteItem: React.FC<FavoriteItemProps> = ({
  item,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { accessToken } = useAppSelector((state) => state.auth);

  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();
  const [toggleFavoriteWaypoint] = useToggleFavoriteWaypointMutation();

  const onPress = useCallback(async (favorite: any) => {
    if (favorite?.road?.id) {
      navigation.navigate('ShowRouteByIdScreen', {
        roadId: favorite?.road.id,
        accessToken: accessToken ?? '',
      });
    } else if (favorite?.waypoint?.id) {
      navigation.navigate('ShowWaypointById', {
        waypointId: favorite?.waypoint.id,
        accessToken: accessToken ?? '',
      });
    }

  }, [item, navigation, accessToken]);

  const handleRemoveFavorite = useCallback(
    async (item: any) => {
      try {
        if (!accessToken) return;
        if (isFavoriteRoad(item)) {
          await toggleFavoriteRoad({ accessToken, roadId: item.id }).unwrap();
        } else {
          await toggleFavoriteWaypoint({ accessToken, waypointId: item.id }).unwrap();
        }
      } catch (err) {
        console.error('Failed to remove favorite:', err);
      }
    },
    [accessToken, toggleFavoriteRoad, toggleFavoriteWaypoint],
  );
  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      <View style={styles.itemContent}>
        <View style={styles.iconContainer}>
          <Icon
            name={item?.key?.includes('road') ? 'directions-car' : 'location-on'}
            size={20}
            color='#2196F3'
          />
        </View>
        <View style={styles.itemText}>
          <Text style={styles.itemType}>
            {/* {item?.road ? item?.road?.description : item?.waypoint?.description} */}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        // onPress={() => handleRemoveFavorite(item)}
        activeOpacity={0.7}
      >
        <Icon name='close' size={20} color='#d32f2f' />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: { marginLeft: 12, flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500', color: '#000' },
  itemType: { fontSize: 12, color: '#999', marginTop: 2 },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
});
