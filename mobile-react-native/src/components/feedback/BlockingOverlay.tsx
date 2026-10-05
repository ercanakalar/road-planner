import { memo } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { radius, shadows, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  visible: boolean;
  message: string;
}

const ignoreBack = () => {};

const BlockingOverlay = ({ visible, message }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={ignoreBack}
    >
      <View
        style={styles.backdrop}
        accessibilityViewIsModal
        accessibilityLiveRegion='polite'
      >
        <View style={styles.card}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.message} accessibilityRole='alert'>
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.overlay,
    },
    card: {
      alignItems: 'center',
      gap: spacing.lg,
      minWidth: 220,
      maxWidth: 320,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      ...shadows.md,
    },
    message: {
      ...typography.body,
      color: colors.text,
      textAlign: 'center',
    },
  });

export default memo(BlockingOverlay);
