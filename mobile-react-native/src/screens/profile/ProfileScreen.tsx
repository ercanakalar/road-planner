import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Container from 'components/ui/Container';
import ScreenState from 'components/ui/ScreenState';
import SettingsRow from 'components/ui/SettingsRow';
import useProfileScreen from 'hooks/profile/useProfileScreen';
import { resolvePhotoUrl } from 'utils/resolvePhotoUrl';

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

const ProfileScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    user,
    displayName,
    isLoading,
    isLoggingOut,
    handleLogout,
    goToProfile,
    goToSettings,
    goToKvkk,
  } = useProfileScreen(navigation);

  if (isLoading) {
    return <ScreenState variant='loading' title='Loading profile…' />;
  }

  const photo = resolvePhotoUrl(user?.photo);
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          {/*
            An avatar nobody has set is drawn as their initial rather than
            fetched from a stranger's placeholder service: the old fallback
            put a photograph of an unrelated person on this screen, and told
            that service who was looking at it.
          */}
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}

          <Text style={styles.name}>{displayName}</Text>
          {user?.email ? (
            <Text style={styles.email}>{user.email}</Text>
          ) : null}
        </View>

        <View style={styles.group}>
          <SettingsRow
            icon='person-outline'
            label='Edit profile'
            onPress={goToProfile}
          />
          <SettingsRow
            icon='settings-outline'
            label='Settings'
            onPress={goToSettings}
          />
          <SettingsRow
            icon='shield-checkmark-outline'
            label='KVKK consent'
            onPress={goToKvkk}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logout,
            pressed && styles.logoutPressed,
          ]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          accessibilityRole='button'
          accessibilityState={{ disabled: isLoggingOut }}
        >
          <Ionicons name='log-out-outline' size={20} color={colors.danger} />
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </Text>
        </Pressable>
      </ScrollView>
    </Container>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    // The green panel behind the avatar is the only place on this screen the
    // brand shows up, which is enough for a screen that is mostly a list.
    header: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: colors.primary,
      ...shadows.md,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: radius.pill,
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 3,
      borderColor: colors.textInverse,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.textInverse,
    },
    avatarInitial: {
      ...typography.display,
      color: colors.primary,
    },
    name: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 25,
      color: colors.textInverse,
    },
    email: {
      ...typography.caption,
      color: colors.textInverse,
      opacity: 0.85,
    },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.sm,
    },
    logout: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadows.sm,
    },
    logoutPressed: { backgroundColor: colors.dangerSoft },
    logoutText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.danger,
    },
  });

export default React.memo(ProfileScreen);
