import { StyleSheet, View } from 'react-native';

import { useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

const BottomSheetHandle = () => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.indicator} />
    </View>
  );
};

export default BottomSheetHandle;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingTop: 8,
      paddingBottom: 10,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
    },
    indicator: {
      width: 42,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.borderStrong,
      marginBottom: 8,
    },
    title: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
  });
