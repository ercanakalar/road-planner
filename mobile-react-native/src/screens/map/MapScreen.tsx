import React from 'react';
import { Button, StyleSheet, View } from 'react-native';


import { MapScreenProps } from 'types/map-screen-type';

import Container from 'components/Container';


const MapScreen = ({ navigation }: MapScreenProps) => {
    return (
        <Container>
            <View style={styles.container}>
                <Button
                    title="Route"
                    onPress={() => navigation.navigate('ShowRouteByIdScreen')}
                />
                <Button
                    title="Edit Route"
                    onPress={() => navigation.navigate('EditWaypointScreen')}
                />
            </View>
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
});

export default MapScreen;
