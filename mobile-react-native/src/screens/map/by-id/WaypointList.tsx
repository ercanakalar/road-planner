import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WaypointWithAddress } from 'types/map-screen-type';

export const WaypointList = React.memo(({ waypoints }: { waypoints: WaypointWithAddress[] }) => (
    <>
        <Text style={styles.subheading}>Waypoints:</Text>
        {waypoints.map((wp, index) => (
            <View key={wp.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                    {index + 1}. {wp.address?.address}
                </Text>
                <Text style={styles.cardText}>
                    {wp.address?.district}, {wp.address?.province}
                </Text>
                <Text style={styles.cardText}>
                    📍 {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                </Text>
            </View>
        ))}
    </>
));

const styles = StyleSheet.create({
    subheading: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 8,
    },
    card: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    cardTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 2,
    },
    cardText: {
        fontSize: 14,
        color: '#333',
    },
});
