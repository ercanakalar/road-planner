import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from 'store/hook';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { FavoriteItemProps } from 'types/screens/mapScreenType';

export const FavoriteItem: React.FC<FavoriteItemProps> = ({
  item,
  onPress,
  onRemove,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { accessToken } = useAppSelector((state) => state.auth);

  const handleRemove = () => {
    Alert.alert(
      'Remove Favorite',
      `Are you sure you want to remove "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: onRemove, style: 'destructive' },
      ],
    );
  };

  const handleItemPress = useCallback(() => {
    const routeId = item?.roadId ?? item?.id ?? item?._id;

    navigation.navigate('ShowRouteByIdScreen', {
      routeId,
      accessToken: accessToken ?? '',
    });
  }, [onPress, item, navigation, accessToken]);

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={handleItemPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <View style={styles.iconContainer}>
          <Icon
            name={item.type === 'road' ? 'directions-car' : 'location-on'}
            size={20}
            color='#2196F3'
          />
        </View>
        <View style={styles.itemText}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemType}>
            {item.type === 'road' ? 'Road' : 'Waypoint'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={handleRemove}
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
