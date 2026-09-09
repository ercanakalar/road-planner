import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import { radius, shadows, spacing, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props extends BottomTabBarButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Read out when the tab bar has not been given an `aria-label` of its own. */
  label: string;
}

/**
 * The raised button in the middle of the tab bar.
 *
 * It is a tab, not a floating action button laid over one — the press is an
 * ordinary tab press, handed to us in `onPress`, and only the drawing is
 * different. Which tab sits here is the navigator's business; this only knows
 * how to draw one.
 *
 * The props are the ones `BottomTabItem` actually passes, which are the DOM-ish
 * spellings rather than the React Native ones: `aria-selected` says whether
 * this tab is the open one, and `aria-label` carries `tabBarAccessibilityLabel`.
 * `accessibilityState` and `accessibilityLabel` are in the prop *type*, because
 * it widens `PlatformPressable`'s, but are never passed — reading those instead
 * type-checks and then quietly never fires.
 *
 * `style` and `children` from the tab bar are deliberately dropped: the first
 * lays a tab out flat in the row, and the second is the icon-and-label pair
 * this button draws for itself.
 */
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
        // The button is raised out of the bar, so a press that lands just
        // below it is still aimed at it.
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

/**
 * Builds the `tabBarButton` for whichever screen sits in the middle.
 *
 * `tabBarButton` is *called*, not mounted: `BottomTabItem` does
 * `children: button(props)`. So this returns a plain function — handing it a
 * `memo()` object throws "Object is not a function" the first time the tab bar
 * renders — and that function returns an element rather than inlining the
 * markup, so the hooks above belong to a component of their own instead of to
 * whichever caller invoked it.
 *
 * Call it once, at module scope. Building it inside a render would hand the
 * navigator a new function every frame and remount the button with it.
 */
export const centreTabButton =
  (icon: keyof typeof Ionicons.glyphMap, label: string) =>
  (props: BottomTabBarButtonProps) => (
    <MemoCentreTabButton icon={icon} label={label} {...props} />
  );

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Holds the button's own width in the row so the four tabs either side
    // stay evenly spaced, whatever the button does above the bar.
    slot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    button: {
      width: 56,
      height: 56,
      // Half out of the bar, which is what makes it read as the primary
      // action rather than the middle tab.
      marginTop: -spacing.xl,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      // Separates the circle from the bar behind it in both themes, where a
      // shadow alone does almost nothing in dark.
      borderWidth: 4,
      borderColor: colors.surface,
      ...shadows.lg,
    },
    buttonFocused: { backgroundColor: colors.primaryDark },
    buttonPressed: { transform: [{ scale: 0.94 }] },
  });

export default centreTabButton;
