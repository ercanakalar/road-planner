import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import type { StopShape } from 'types/map-screen-type';
import {
  bendIcon,
  bendLabel,
  runLabel,
  slopeIcon,
  slopeLabel,
} from 'utils/stopShape';

type Props = {
  shape: StopShape;
};

/**
 * How the road runs into and out of one stop: how far and how much it climbs to
 * get here, and how sharply it turns once it does.
 *
 * Draws nothing at all when there is nothing measured — the first and last
 * stops of a route, and every stop on a route saved before the server started
 * reading ground heights. A row of empty dashes would be worse than no row.
 */
const StopShapeRow = ({ shape }: Props) => {
  const styles = useThemedStyles(createStyles);

  const slope = slopeLabel(shape);
  const bend = bendLabel(shape);
  const run = runLabel(shape);

  if (!slope && !bend) return null;

  const steep = shape.slopeGrade === 'steep';
  const tight = shape.bendShape === 'sharp' || shape.bendShape === 'hairpin';

  return (
    <View style={styles.row}>
      {slope ? (
        <View style={[styles.chip, steep && styles.chipAlert]}>
          <Ionicons
            name={slopeIcon(shape)}
            size={12}
            style={steep ? styles.iconAlert : styles.icon}
          />
          <Text style={[styles.label, steep && styles.labelAlert]}>
            {slope}
          </Text>
        </View>
      ) : null}

      {bend ? (
        <View style={[styles.chip, tight && styles.chipAlert]}>
          <Ionicons
            name={bendIcon(shape)}
            size={12}
            style={tight ? styles.iconAlert : styles.icon}
          />
          <Text style={[styles.label, tight && styles.labelAlert]}>{bend}</Text>
        </View>
      ) : null}

      {run ? <Text style={styles.run}>{run}</Text> : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xxs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    // A steep climb or a hairpin is the reason anyone reads this row, so those
    // two are drawn at full contrast and the ordinary ones stay quiet. The
    // difference is weight rather than hue: every colour in the palette is
    // already spoken for by the pins and the route lines, and a sixth one
    // would read as one of them.
    chipAlert: { backgroundColor: colors.border },
    icon: { color: colors.textMuted },
    iconAlert: { color: colors.text },
    label: {
      ...typography.caption,
      color: colors.textMuted,
    },
    labelAlert: { color: colors.text, fontWeight: '700' },
    run: {
      ...typography.caption,
      color: colors.textSubtle,
    },
  });

export default memo(StopShapeRow);
