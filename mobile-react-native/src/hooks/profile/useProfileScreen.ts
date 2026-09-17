import { useCallback, useEffect } from 'react';
import { NavigationProp } from '@react-navigation/native';

import useConfirm from 'hooks/feedback/useConfirm';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { useLogoutMutation } from 'store/services/authenticationService';
import { useGetUserQuery } from 'store/services/profileService';
import { useGetUnreadCountQuery } from 'store/services/notificationService';
import { logout } from 'store/slices/authSlice';
import { updateUserProfile } from 'store/slices/userSlice';
import { RootStackParamList } from 'types/screens/screens';
import { useTranslation } from 'react-i18next';

/**
 * The signed-in profile: who you are, where the sub-screens are, and signing
 * out — which clears the session locally whether or not the server answers.
 */
export function useProfileScreen(
  navigation: NavigationProp<RootStackParamList>,
) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const userId = useAppSelector((state) => state.auth.userId);

  const [logoutTrigger, { isLoading: isLoggingOut }] = useLogoutMutation();

  const { data, isLoading } = useGetUserQuery(
    { userId: userId ?? '' },
    { skip: !userId },
  );

  // Its own request, and a small one: the badge has to be right every time this
  // screen is looked at, and the profile is cached for five minutes.
  const { data: unreadCount = 0 } = useGetUnreadCountQuery(undefined, {
    skip: !userId,
  });

  useEffect(() => {
    if (!data) return;
    dispatch(updateUserProfile(data));
  }, [data, dispatch]);

  const confirmLogout = useCallback(async () => {
    try {
      await logoutTrigger().unwrap();
    } catch {
      // A server that will not take the sign-out back does not get to keep the
      // session on this device.
    } finally {
      dispatch(logout());
      navigation.reset({ index: 0, routes: [{ name: 'HomeTabNavigator' }] });
    }
  }, [dispatch, logoutTrigger, navigation]);

  const handleLogout = useCallback(async () => {
    const confirmed = await confirm({
      title: t('dialogs.signOutTitle'),
      message: t('dialogs.signOutMessage'),
      confirmLabel: t('dialogs.signOutTitle'),
      icon: 'log-out-outline',
      tone: 'danger',
    });
    if (confirmed) await confirmLogout();
  }, [confirm, confirmLogout, t]);

  const goToProfile = useCallback(() => {
    if (userId) navigation.navigate('ProfileDetailScreen', { userId });
  }, [navigation, userId]);

  const goToNotifications = useCallback(
    () => navigation.navigate('NotificationsScreen'),
    [navigation],
  );

  const goToSettings = useCallback(
    () => navigation.navigate('SettingsScreen'),
    [navigation],
  );

  const goToKvkk = useCallback(
    () => navigation.navigate('KvkkScreen'),
    [navigation],
  );

  const displayName =
    [data?.firstName, data?.lastName].filter(Boolean).join(' ') ||
    data?.nickName ||
    t('defaults.yourProfile');

  return {
    user: data,
    displayName,
    isLoading,
    isLoggingOut,
    handleLogout,
    unreadCount,
    goToNotifications,
    goToProfile,
    goToSettings,
    goToKvkk,
  };
}

export default useProfileScreen;
