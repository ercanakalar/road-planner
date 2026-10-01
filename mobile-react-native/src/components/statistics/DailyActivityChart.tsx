import { memo, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { StatRow } from 'components/statistics/StatTable';
import useStatisticsFormat from 'hooks/statistics/useStatisticsFormat';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { ColorScheme } from 'types/theme';
import { DailyUsage } from 'types/store/services/statisticsService-type';

// One series, so one hue: categorical slot one, validated against the card
// surface in both schemes.
const SERIES: Record<ColorScheme, string> = {
  light: '#2a78d6',
  dark: '#3987e5',
};

const PLOT_HEIGHT = 120;
const BAR_MAX_WIDTH = 24;
const BAR_GAP = 2;
const BAR_RADIUS = 4;
const RESTING_OPACITY = 0.55;

interface Props {
  days: readonly DailyUsage[];
}

// Active people per day. Tapping a day reads it out above the plot; every
// value is also in the table underneath, so nothing is only reachable by tap.
const DailyActivityChart = ({ days }: Props) => {
  const { scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const { count, day } = useStatisticsFormat();

  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(days.length - 1);
  const [isTableShown, setIsTableShown] = useState(false);

  useEffect(() => setSelected(days.length - 1), [days]);

  const peak = useMemo(
    () => Math.max(1, ...days.map(({ activeUsers }) => activeUsers)),
    [days],
  );

  if (days.length === 0) return null;

  const slot = width / days.length;
  const barWidth = Math.max(1, Math.min(BAR_MAX_WIDTH, slot - BAR_GAP));
  const color = SERIES[scheme];
  const current = days[Math.min(selected, days.length - 1)];

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) =>
    setWidth(nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <View style={styles.readout} accessibilityLiveRegion='polite'>
        <Text style={styles.readoutValue}>{count(current.activeUsers)}</Text>
        <Text style={styles.readoutLabel}>
          {t('statistics.activePeopleOn', { date: day(current.date, 'long') })}
          {' · '}
          {t('statistics.usesCount', { count: current.events })}
        </Text>
      </View>

      <View style={styles.plot}>
        <Text style={styles.tick}>{count(peak)}</Text>

        <View style={styles.bars} onLayout={handleLayout}>
          {days.map((entry, index) => {
            const height =
              entry.activeUsers === 0
                ? 0
                : Math.max(2, (entry.activeUsers / peak) * PLOT_HEIGHT);
            const isSelected = index === selected;

            return (
              <Pressable
                key={entry.date}
                onPress={() => setSelected(index)}
                style={[styles.slot, { width: slot }]}
                accessibilityRole='button'
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={t('statistics.dayAccessibility', {
                  date: day(entry.date, 'long'),
                  people: count(entry.activeUsers),
                  uses: count(entry.events),
                })}
              >
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height,
                      backgroundColor: color,
                      opacity: isSelected ? 1 : RESTING_OPACITY,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.baseline} />

        <View style={styles.axis}>
          <Text style={styles.tick}>{day(days[0].date)}</Text>
          <Text style={styles.tick}>{day(days[days.length - 1].date)}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => setIsTableShown((shown) => !shown)}
        accessibilityRole='button'
        accessibilityState={{ expanded: isTableShown }}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Text style={styles.toggleText}>
          {isTableShown
            ? t('statistics.hideNumbers')
            : t('statistics.showNumbers')}
        </Text>
      </Pressable>

      {isTableShown
        ? [...days].reverse().map((entry, index) => (
            <StatRow
              key={entry.date}
              isFirst={index === 0}
              label={day(entry.date, 'long')}
              value={t('statistics.peopleAndUses', {
                people: count(entry.activeUsers),
                uses: count(entry.events),
              })}
            />
          ))
        : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { paddingTop: spacing.lg, gap: spacing.md },
    readout: { paddingHorizontal: spacing.lg, gap: spacing.xxs },
    readoutValue: {
      ...typography.title,
      color: colors.text,
    },
    readoutLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    plot: { paddingHorizontal: spacing.lg, gap: spacing.xs },
    bars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: PLOT_HEIGHT,
    },
    slot: {
      height: PLOT_HEIGHT,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    bar: {
      borderTopLeftRadius: BAR_RADIUS,
      borderTopRightRadius: BAR_RADIUS,
    },
    baseline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderStrong,
    },
    axis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    tick: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    toggle: {
      alignSelf: 'flex-start',
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
    pressed: { opacity: 0.6 },
    toggleText: {
      ...typography.label,
      color: colors.primary,
    },
  });

export default memo(DailyActivityChart);
