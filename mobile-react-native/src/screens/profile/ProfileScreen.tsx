import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import ScreenState from 'components/ScreenState';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { useLogoutMutation } from 'store/services/authenticationService';
import { useGetUserQuery } from 'store/services/profileService';
import { logout } from 'store/slices/authSlice';
import { updateUserProfile } from 'store/slices/userSlice';

import { colors, radius, shadows, spacing, typography } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const FALLBACK_AVATAR = 'https://i.pravatar.cc/150?img=12';

type Props = { navigation: NavigationProp<RootStackParamList> };

const ProfileScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.userId);

  const [logoutTrigger, { isLoading: isLoggingOut }] = useLogoutMutation();

  const { data, isLoading } = useGetUserQuery(
    { userId: userId ?? '' },
    { skip: !userId },
  );

  useEffect(() => {
    if (!data) return;
    dispatch(updateUserProfile(data));
  }, [data, dispatch]);

  const confirmLogout = useCallback(async () => {
    try {
      await logoutTrigger().unwrap();
    } catch {
    } finally {
      dispatch(logout());
      navigation.reset({ index: 0, routes: [{ name: 'HomeTabNavigator' }] });
    }
  }, [dispatch, logoutTrigger, navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sign out', 'You will need to sign in again to continue.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: confirmLogout },
    ]);
  }, [confirmLogout]);

  const goToProfile = useCallback(() => {
    if (userId) navigation.navigate('ProfileDetailScreen', { userId });
  }, [navigation, userId]);

  const goToSettings = useCallback(
    () => navigation.navigate('SettingsScreen'),
    [navigation],
  );

  if (isLoading) {
    return <ScreenState variant='loading' title='Loading profile…' />;
  }

  const displayName =
    [data?.firstName, data?.lastName].filter(Boolean).join(' ') ||
    data?.nickName ||
    'Your profile';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: data?.photo || FALLBACK_AVATAR }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{displayName}</Text>
        {data?.email ? <Text style={styles.email}>{data.email}</Text> : null}
      </View>

      <View style={styles.group}>
        <Row icon='person-outline' label='Edit profile' onPress={goToProfile} />
        <Row icon='settings-outline' label='Settings' onPress={goToSettings} />
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

const Row = ({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    onPress={onPress}
    accessibilityRole='button'
  >
    <Ionicons name={icon} size={20} color={colors.primary} />
    <Text style={styles.rowText}>{label}</Text>
    <Ionicons name='chevron-forward' size={18} color={colors.textSubtle} />
  </Pressable>
);

const styles = StyleSheet.create({
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
