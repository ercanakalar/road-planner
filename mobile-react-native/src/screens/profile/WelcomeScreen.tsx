import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';

import Container from 'components/ui/Container';
import BrandMark, { APP_NAME } from 'components/ui/BrandMark';
import PrimaryButton from 'components/ui/PrimaryButton';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

type Props = { navigation: NavigationProp<RootStackParamList> };

const SELLING_POINTS: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}[] = [
  {
    icon: 'git-branch-outline',
    title: 'Plan',
    body: 'Drop stops, put them in order.',
  },
  {
    icon: 'compass-outline',
    title: 'Explore',
    body: 'Find food and fuel on the way.',
  },
  {
    icon: 'heart-outline',
    title: 'Keep',
    body: 'Saved to every device you use.',
  },
];

/**
 * What the Profile tab shows before anyone has signed in.
 *
 * Deliberately not a gate in front of the app: the Map tab plans a route
 * without an account, and putting this in the way of that would take away the
 * one thing this app lets you do before committing to it. So it sits where the
 * account would be, says what an account is for, and offers the two doors.
 *
 * It is written to fit one screen, and the copy is short because of it. The
 * scroll view under it never scrolls at ordinary text sizes — `flexGrow` fills
 * the screen and there is nothing past the bottom — but it is a scroll view
 * rather than a plain `View` so that someone running a large system font gets
 * the rest of the buttons by scrolling instead of losing them off the edge.
 */
const WelcomeScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const goToSignUp = useCallback(
    () => navigation.navigate('SignUpScreen'),
    [navigation],
  );

  const goToSignIn = useCallback(
    () => navigation.navigate('SignInScreen'),
    [navigation],
  );

  return (
    <Container>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode='never'
      >
        <View style={styles.hero}>
          <BrandMark size={52} onPrimary />
          <Text style={styles.heroTitle}>{APP_NAME}</Text>
          <Text style={styles.heroBody}>
            Plan your journey, every step of the way.
          </Text>
        </View>

        <View style={styles.points}>
          {SELLING_POINTS.map((point) => (
            <View key={point.title} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={point.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.pointText}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointBody}>{point.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label='Get started' onPress={goToSignUp} />
          <PrimaryButton
            label='Sign in'
            variant='secondary'
            onPress={goToSignIn}
          />
        </View>
      </ScrollView>
    </Container>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.lg,
    },
    hero: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: colors.primary,
      ...shadows.md,
    },
    heroTitle: {
      ...typography.title,
      color: colors.textInverse,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    heroBody: {
      ...typography.caption,
      color: colors.textInverse,
      opacity: 0.85,
      textAlign: 'center',
    },
    points: { gap: spacing.sm },
    point: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    pointIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    pointText: { flex: 1, gap: spacing.xxs },
    pointTitle: {
      ...typography.label,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    pointBody: {
      ...typography.caption,
      color: colors.textMuted,
    },
    // Pinned to the bottom of whatever room is left, so the buttons land in
    // the same place whether or not the points above fill the screen.
    actions: { gap: spacing.sm, marginTop: 'auto' },
  });

export default WelcomeScreen;
