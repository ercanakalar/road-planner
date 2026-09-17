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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const {
    user,
    displayName,
    isLoading,
    isLoggingOut,
    handleLogout,
    unreadCount,
    goToNotifications,
    goToProfile,
    goToSettings,
    goToKvkk,
  } = useProfileScreen(navigation);

  if (isLoading) {
    return <ScreenState variant='loading' title={t('profile.loading')} />;
  }

  const photo = resolvePhotoUrl(user?.photo);
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <Container>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/*
          The card is the one place the brand shows up on a screen that is
          otherwise a list, and the whole of it opens the editor — the avatar,
          the name and the address are exactly what that screen changes, so
          making them the button saves a trip through a row named after them.
        */}
        <Pressable
          onPress={goToProfile}
          style={({ pressed }) => [styles.header, pressed && styles.pressed]}
          accessibilityRole='button'
          accessibilityLabel={t('profile.editProfileOf', { name: displayName })}
        >
          <View style={styles.avatarWrap}>
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

            <View style={styles.editBadge}>
              <Ionicons name='pencil' size={12} color={colors.primary} />
            </View>
          </View>

          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>

            {user?.nickName ? (
              <Text style={styles.handle} numberOfLines={1}>
                @{user.nickName}
              </Text>
            ) : null}

            {user?.email ? (
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.yourAccount')}</Text>

          <View style={styles.group}>
            <SettingsRow
              icon='person-outline'
              label={t('profile.editProfile')}
              description={t('profile.editProfileHint')}
              divided={false}
              onPress={goToProfile}
            />
            <SettingsRow
              icon='notifications-outline'
              label={t('profile.notifications')}
              description={t('profile.notificationsHint')}
              badge={unreadCount}
              onPress={goToNotifications}
            />
            <SettingsRow
              icon='options-outline'
              label={t('profile.settings')}
              description={t('profile.settingsHint')}
              onPress={goToSettings}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.privacy')}</Text>

          <View style={styles.group}>
            <SettingsRow
              icon='shield-checkmark-outline'
              label={t('profile.kvkkConsent')}
              description={t('profile.kvkkHint')}
              divided={false}
              onPress={goToKvkk}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logout,
            pressed && styles.logoutPressed,
          ]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          accessibilityRole='button'
          accessibilityState={{ disabled: isLoggingOut, busy: isLoggingOut }}
        >
          <Ionicons name='log-out-outline' size={20} color={colors.danger} />
          <Text style={styles.logoutText}>
            {isLoggingOut ? t('profile.signingOut') : t('profile.signOut')}
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
      gap: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: colors.primary,
      ...shadows.md,
    },
    pressed: { opacity: 0.9 },
    avatarWrap: { width: 72, height: 72 },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: radius.pill,
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
      ...typography.title,
      fontSize: 28,
      lineHeight: 34,
      color: colors.primary,
    },
    editBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 26,
      height: 26,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.textInverse,
    },
    // Takes the leftover width so a long name truncates instead of pushing the
    // avatar off the card.
    identity: { flex: 1, gap: spacing.xxs },
    name: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 25,
      color: colors.textInverse,
    },
    handle: {
      ...typography.label,
      color: colors.textInverse,
      opacity: 0.9,
    },
    email: {
      ...typography.caption,
      color: colors.textInverse,
      opacity: 0.8,
    },
    section: { gap: spacing.sm },
    sectionTitle: {
      ...typography.overline,
      color: colors.textSubtle,
      paddingHorizontal: spacing.xs,
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
