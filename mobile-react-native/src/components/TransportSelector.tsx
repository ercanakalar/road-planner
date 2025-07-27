import { transportModes } from "constants/transportMods";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TransportSelectorProps } from "types/transport-type";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { secondsToHour } from "utils/secondsToHour";

const TransportSelector: React.FC<TransportSelectorProps> = ({
    selected,
    onChange,
    durations,
}) => (
    <View style={styles.transportRow}>
        {transportModes.map((mode) => (
            <TouchableOpacity
                key={mode.key}
                style={[
                    styles.transportBtn,
                    selected === mode.key && styles.activeTransport,
                ]}
                onPress={() => onChange(mode.key)}
            >
                <Ionicons
                    name={mode.icon}
                    size={20}
                    color={selected === mode.key ? "white" : "#555"}
                />
                <View>
                    <Text
                        style={[
                            styles.transportText,
                            selected === mode.key && styles.activeText,
                        ]}
                    >
                        {mode.label}
                    </Text>
                    <Text
                        style={[
                            styles.durationText,
                            selected === mode.key && styles.activeText,
                        ]}
                    >
                        {durations?.[mode.key]}
                    </Text>
                </View>
            </TouchableOpacity>
        ))}
    </View>
);


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
    transportRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 16,
    },
    transportBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#f1f1f1",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    activeTransport: {
        backgroundColor: "#2c7be5",
    },
    transportText: {
        fontSize: 14,
        color: "#333",
    },
    durationText: {
        fontSize: 12,
        color: "#777",
        marginTop: 2,
    },
    activeText: {
        color: "white",
    },
});

export default TransportSelector;