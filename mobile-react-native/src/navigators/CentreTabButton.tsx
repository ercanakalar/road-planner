import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import { radius, shadows, spacing, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props extends BottomTabBarButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const CentreTabButton = ({
  icon,
  label,
  onPress,
  onLongPress,
  testID,
  'aria-label': ariaLabel,
  'aria-selected': isFocused,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.slot}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        testID={testID}
        accessibilityRole='button'
        accessibilityState={{ selected: !!isFocused }}
        accessibilityLabel={ariaLabel ?? label}
        hitSlop={{ top: 6, bottom: 12, left: 10, right: 10 }}
        style={({ pressed }) => [
          styles.button,
          isFocused && styles.buttonFocused,
          pressed && styles.buttonPressed,
        ]}
      >
        <Ionicons name={icon} size={28} color={colors.textInverse} />
      </Pressable>
    </View>
  );
};

const MemoCentreTabButton = memo(CentreTabButton);

export const centreTabButton =
  (icon: keyof typeof Ionicons.glyphMap, label: string) =>
  (props: BottomTabBarButtonProps) => (
    <MemoCentreTabButton icon={icon} label={label} {...props} />
  );

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    slot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    button: {
      width: 56,
      height: 56,
      marginTop: -spacing.xl,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 4,
      borderColor: colors.surface,
      ...shadows.lg,
    },
    buttonFocused: { backgroundColor: colors.primaryDark },
    buttonPressed: { transform: [{ scale: 0.94 }] },
  });

export default centreTabButton;
