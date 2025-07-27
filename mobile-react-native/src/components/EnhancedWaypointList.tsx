import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Pressable,
    SafeAreaView,
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useAppSelector } from 'store/hook';
import {
    useGetRoadByIdQuery,
    useUpdateRoadByIdMutation,
    useDeleteWaypointByRoadIdMutation,
} from 'store/services/roadService';
import {
    useAddFavoriteWaypointMutation,
    useRemoveFavoriteWaypointMutation,
} from 'store/services/favoriteService';
import TransportSelector from './TransportSelector';
import { EnhancedWaypointListProps, WaypointWithAddress, WaypointWithAddressAndId } from 'types/map-screen-type';
import { TransportMode, WaypointOption } from 'types/transport-type';
import WaypointOptions from 'screens/map/by-id/WaypointOptions';
import appConfig from 'constants/appConfig';
import { secondsToHour } from 'utils/secondsToHour';
import Animated from 'react-native-reanimated';
import { useActiveScaleAnimation } from 'hooks/useActiveScaleAnimation';

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

const EnhancedWaypointList: React.FC<EnhancedWaypointListProps> = ({
    routeId
}) => {
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const [selectedPair, setSelectedPair] = useState<string[]>([]);
    const [selectedMode, setSelectedMode] = useState<TransportMode>('driving');
    const [durations, setDurations] = useState<{
        driving?: string;
        walking?: string;
        public?: string;
    }>({});

    const { data, refetch } = useGetRoadByIdQuery({
        accessToken,
        routeId,
    }) as {
        data: WaypointWithAddressAndId;
        refetch: () => void;
    };

    const [deleteWaypoint] = useDeleteWaypointByRoadIdMutation();
    const [addFavoriteWaypoint] = useAddFavoriteWaypointMutation();
    const [removeFavoriteWaypoint] = useRemoveFavoriteWaypointMutation();
    const [updateRoadById] = useUpdateRoadByIdMutation()

    const updateRoadByIdRef = useRef(updateRoadById);

    useEffect(() => {
        updateRoadByIdRef.current = updateRoadById;
    }, [updateRoadById]);

    const toggleSelection = (id: string) => {
        setSelectedPair((prev) => {
            if (prev.includes(id)) {
                return prev.filter((item) => item !== id);
            } else {
                return prev.length < 2 ? [...prev, id] : [prev[1], id];
            }
        });
    };

    const handleOptionSelect = async (option: WaypointOption, item: WaypointWithAddress) => {
        if (option === 'delete') handleDelete(item.id);
        else if (option === 'favorite') toggleFavorite(item);
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
    const handleDelete = async (id: string) => {
        await deleteWaypoint({ accessToken, routeId, waypointId: id }).unwrap();
        refetch();
    };

    const onModeChange = (mode: TransportMode) => {
        setSelectedMode(mode);
    };

    useEffect(() => {

    }, [selectedPair]);

    useEffect(() => {
        const fetchTravelTimes = async () => {
            try {
                const [origin, destination] = data.wayPoints;
                const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${selectedMode}&key=${REACT_APP_MAP_API_KEY}`;

                const response = await fetch(url);
                const directionsData = await response.json();

                if (directionsData.status === 'OK' && directionsData.routes && directionsData.routes.length > 0) {
                    const durationInSeconds = directionsData.routes[0].legs[0].duration.value;

                    setDurations(prev => ({
                        ...prev,
                        [selectedMode]: secondsToHour(durationInSeconds as number)
                    }));
                }
            } catch (error) {
                console.error('Error fetching travel times:', error);
            }
        };

        fetchTravelTimes();
    }, [selectedMode, selectedPair, data?.wayPoints]);

    const renderItem = ({ item, drag, isActive }: RenderItemParams<WaypointWithAddress>) => {
        const animatedStyle = useActiveScaleAnimation(isActive);

        return (
            <Animated.View style={animatedStyle}>
                <Pressable
                    onLongPress={drag}
                    disabled={isActive}
                    style={[styles.card, isActive && styles.cardActive, selectedPair.includes(item.id) && styles.cardSelected]}
                    onPress={() => toggleSelection(item.id)}
                >
                    <View style={styles.row}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.order}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{item.address?.address}</Text>
                            <Text style={styles.subtitle}>{item.address?.district}, {item.address?.province}</Text>
                        </View>
                        <TouchableOpacity onPress={() => toggleFavorite(item)}>
                            <Ionicons
                                name={item.favoriteWaypoint ? 'star' : 'star-outline'}
                                size={20}
                                color={item.favoriteWaypoint ? '#f5c518' : '#aaa'}
                            />
                        </TouchableOpacity>
                    </View>
                    <WaypointOptions onOptionSelect={(opt) => handleOptionSelect(opt, item)} />
                </Pressable>
            </Animated.View>
        )
    };


    const updateOrder = useCallback((newData: WaypointWithAddress[]) => {
        const newOrder = newData.map((item, index) => ({
            ...item,
            order: index + 1,
        }));

        updateRoadByIdRef.current({
            accessToken,
            routeId,
            title: data?.title,
            description: data?.description,
            waypoints: newOrder,
        })
            .unwrap()
            .then(() => refetch())
            .catch(error => {
                console.error("Failed to update order:", error);
            });
    }, [accessToken, routeId, data?.title, data?.description, refetch]);

    console.log(durations);


    return (
        <SafeAreaView style={{ flex: 1 }}>
            <BottomSheetScrollView
                contentContainerStyle={{ padding: 16 }}
                nestedScrollEnabled={true}
            >
                <View style={styles.privacyModeWrap}>
                    <Text style={styles.privacyText}>Mode for selected pair:</Text>
                    <TransportSelector selected={selectedMode} onChange={onModeChange} durations={durations} />
                </View>

                <DraggableFlatList
                    data={data.wayPoints || []}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    onDragEnd={({ data }) => updateOrder(data)}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    nestedScrollEnabled={true}
                    scrollEnabled={true}
                    style={{ height: data.wayPoints?.length ? data.wayPoints.length * 120 : 300 }}
                />
            </BottomSheetScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardSelected: {
        borderWidth: 2,
        borderColor: '#2c7be5',
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    index: {
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 8,
    },
    addressWrap: { flex: 1 },
    address: { fontWeight: '600', color: '#111' },
    subAddress: { color: '#666' },
    transportRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    transportBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f1f1f1',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    activeTransport: {
        backgroundColor: '#2c7be5',
    },
    transportText: { fontSize: 14 },
    activeText: { color: 'white' },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 8,
        backgroundColor: '#f9f9f9',
    },
    privacyModeWrap: {
        marginBottom: 16,
    },
    privacyText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
    },
    optionBtn: {
        alignItems: 'center',
    },
    optionText: {
        marginTop: 4,
        fontSize: 12,
        color: '#333',
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F9FAFB',
    },

    cardActive: {
        backgroundColor: '#e6f7ff',
        transform: [{ scale: 1.02 }],
        shadowOpacity: 0.15,
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

});


export default EnhancedWaypointList;
