import { useCallback, useEffect } from 'react';
import { NavigationProp } from '@react-navigation/native';

import useConfirm from 'hooks/feedback/useConfirm';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { useLogoutMutation } from 'store/services/authenticationService';
import { useGetUserQuery } from 'store/services/profileService';
import { logout } from 'store/slices/authSlice';
import { updateUserProfile } from 'store/slices/userSlice';
import { RootStackParamList } from 'types/screens/screens';

/**
 * The signed-in profile: who you are, where the sub-screens are, and signing
 * out — which clears the session locally whether or not the server answers.
 */
export function useProfileScreen(
  navigation: NavigationProp<RootStackParamList>,
) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
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
      // A server that will not take the sign-out back does not get to keep the
      // session on this device.
    } finally {
      dispatch(logout());
      navigation.reset({ index: 0, routes: [{ name: 'HomeTabNavigator' }] });
    }
  }, [dispatch, logoutTrigger, navigation]);

  const handleLogout = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Sign out',
      message: 'You will need to sign in again to continue.',
      confirmLabel: 'Sign out',
      icon: 'log-out-outline',
      tone: 'danger',
    });
    if (confirmed) await confirmLogout();
  }, [confirm, confirmLogout]);

  const goToProfile = useCallback(() => {
    if (userId) navigation.navigate('ProfileDetailScreen', { userId });
  }, [navigation, userId]);

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
    'Your profile';

  return {
    user: data,
    displayName,
    isLoading,
    isLoggingOut,
    handleLogout,
    goToProfile,
    goToSettings,
    goToKvkk,
  };
}

export default useProfileScreen;
