import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  Pressable,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface ContextMenuProps {
  visible: boolean;
  options: { label: string; action: (event: GestureResponderEvent) => void }[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  options,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType='fade'
      onRequestClose={onClose}
      transparent
    >
      <View style={styles.overlay}>
        <View style={styles.menu}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={(e) => {
                option.action(e);
                onClose();
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
    width,
    height,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 500,
  },
  menu: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
});

export default ContextMenu;
