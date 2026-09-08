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

const FALLBACK_AVATAR = 'https://i.pravatar.cc/150?img=12';

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: resolvePhotoUrl(user?.photo) ?? FALLBACK_AVATAR }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{displayName}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
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
          styles.row,
          styles.logoutRow,
          pressed && styles.rowPressed,
        ]}
        onPress={handleLogout}
        disabled={isLoggingOut}
        accessibilityRole='button'
      >
        <Ionicons name='log-out-outline' size={20} color={colors.danger} />
        <Text style={[styles.rowText, styles.logoutText]}>
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: spacing.lg,
      gap: spacing.lg,
      paddingTop: spacing.xxl,
    },
    header: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.lg,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: radius.pill,
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceAlt,
    },
    name: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 25,
      color: colors.text,
    },
    email: {
      ...typography.caption,
      color: colors.textMuted,
    },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    rowText: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
    logoutRow: {
      borderRadius: radius.lg,
      borderTopWidth: 0,
      ...shadows.sm,
    },
    logoutText: { color: colors.danger },
  });

export default React.memo(ProfileScreen);
