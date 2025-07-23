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
import { NavigationProp } from '@react-navigation/native';
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
import {
  useAddFavoriteWaypointMutation,
  useRemoveFavoriteWaypointMutation,
} from 'store/services/favoriteService';

type Props = {
  routeId: string;
  style: ViewStyle;
  navigation: NavigationProp<any>;
};

const WaypointListWithActions = ({ routeId, style, navigation }: Props) => {
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const [updateRoadById] = useUpdateRoadByIdMutation();
  const [deleteWaypoint] = useDeleteWaypointByRoadIdMutation();
  const [addFavoriteWaypoint] = useAddFavoriteWaypointMutation();
  const [removeFavoriteWaypoint] = useRemoveFavoriteWaypointMutation();

  const { data, refetch } = useGetRoadByIdQuery({ accessToken, routeId }) as {
    data: WaypointWithAddressAndId;
    refetch: () => void;
  };

  const updateOrder = async (newData: WaypointWithAddress[]) => {
    const newOrder = newData.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    await updateRoadById({
      accessToken,
      routeId,
      title: data?.title,
      description: data?.description,
      waypoints: newOrder,
    }).unwrap();
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteWaypoint({ accessToken, routeId, waypointId: id }).unwrap();
    refetch();
  };

  const toggleFavorite = async (waypoint: WaypointWithAddress) => {
    try {
      if (waypoint.favoriteWaypoint) {
        await removeFavoriteWaypoint({ accessToken, favoriteId: waypoint.favoriteWaypoint.id }).unwrap();
      } else {
        await addFavoriteWaypoint({ accessToken, waypointId: waypoint.id }).unwrap();
      }
      refetch();
    } catch (error) {
      console.warn('Favorite toggle failed:', error);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<WaypointWithAddress>) => (
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
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.button}>
            <Text style={styles.favoriteIcon}>{item.favoriteWaypoint ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.button}>
            <Text>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, style]}>
      <DraggableFlatList
        data={data?.wayPoints || []}
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  button: {
    padding: 6,
  },
  favoriteIcon: {
    fontSize: 18,
    color: '#FFD700',
  },
});
