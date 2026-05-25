import React, { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import useWaypointLogic from 'hooks/useWaypointLogic';

const ShowWaypointByIdScreen = () => {
    const {
        mapRef,
        data,
        isLoading,
        isError,
        initialRegion,
        handleMarkerDragEnd,
    } = useWaypointLogic();

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading waypoint...</Text>
            </View>
        );
    }

    if (isError || !data) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Waypoint not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                showsUserLocation
                showsMyLocationButton
                initialRegion={initialRegion}
            >
                <Marker
                    key={data.id}
                    coordinate={{ latitude: data.latitude, longitude: data.longitude }}
                    onDragEnd={(e) => handleMarkerDragEnd(e, data.id)}
                />
            </MapView>

            {data.address && (
                <View style={styles.infoCard}>
                    <Text style={styles.addressTitle}>
                        {data.address.district}, {data.address.province}
                    </Text>
                    <Text style={styles.addressSub}>{data.address.address}</Text>
                </View>
            )}
        </View>
    );
};

export default memo(ShowWaypointByIdScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 8, fontSize: 14, color: '#666' },
    errorText: { fontSize: 16, color: '#d32f2f' },
    infoCard: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    addressTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
    addressSub: { fontSize: 13, color: '#666' },
});