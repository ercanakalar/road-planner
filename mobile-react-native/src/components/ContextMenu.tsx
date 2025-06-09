import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ContextMenuProps {
    visible: boolean;
    options: { label: string; action: () => void }[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ visible, options, onClose }) => {
    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.menu}>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={() => {
                                option.action();
                                onClose(); // Close the menu after an action
                            }}
                        >
                            <Text style={styles.menuItemText}>{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.menuItem} onPress={onClose}>
                        <Text style={[styles.menuItemText, { color: 'red' }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    menu: {
        width: 200,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
    },
    menuItem: {
        padding: 10,
        width: '100%',
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 16,
        color: '#007BFF',
    },
});

export default ContextMenu;