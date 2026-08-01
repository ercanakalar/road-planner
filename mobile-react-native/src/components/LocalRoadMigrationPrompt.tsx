import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from './PrimaryButton';
import { useAppSelector } from 'store/hook';
import { colors, radius, shadows, spacing, typography } from 'theme';
import { RootStackParamList } from 'types/screens/screens';


const LocalRoadMigrationPrompt = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const isHydrated = useAppSelector((state) => state.localRoad.isHydrated);
  const transferableCount = useAppSelector(
    (state) =>
      state.localRoad.roads.filter((road) => road.wayPoints.length > 0).length,
  );

  const [isVisible, setIsVisible] = useState(false);
  const wasLoggedInRef = useRef(isLoggedIn);
  const hasPromptedRef = useRef(false);

  useEffect(() => {
    const justSignedIn = isLoggedIn && !wasLoggedInRef.current;
    wasLoggedInRef.current = isLoggedIn;

    if (!justSignedIn || !isHydrated || hasPromptedRef.current) return;
    if (transferableCount === 0) return;

    hasPromptedRef.current = true;
    setIsVisible(true);
  }, [isHydrated, isLoggedIn, transferableCount]);

  const dismiss = useCallback(() => setIsVisible(false), []);

  const goToSettings = useCallback(() => {
    setIsVisible(false);
    navigation.navigate('SettingsScreen');
  }, [navigation]);

  if (!isVisible) return null;

  return (
    <Modal
      visible
      transparent
      animationType='fade'
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name='cloud-upload-outline' size={26} color={colors.primary} />
          </View>

          <Text style={styles.title}>Keep your routes?</Text>
          <Text style={styles.body}>
            You have {transferableCount} route
            {transferableCount === 1 ? '' : 's'} saved on this device. Save
            {transferableCount === 1 ? ' it' : ' them'} to your account so
            {transferableCount === 1 ? ' it is' : ' they are'} available
            everywhere you sign in.
          </Text>

          <PrimaryButton
            label='Go to Settings'
            onPress={goToSettings}
            style={styles.action}
          />

          <Pressable
            onPress={dismiss}
            style={styles.later}
            accessibilityRole='button'
          >
            <Text style={styles.laterText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    color: colors.text,
  },
  body: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  action: { alignSelf: 'stretch' },
  later: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  laterText: {
    ...typography.label,
    color: colors.textMuted,
  },
});

export default memo(LocalRoadMigrationPrompt);
