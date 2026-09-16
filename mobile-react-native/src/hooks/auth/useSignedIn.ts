import { useCallback } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import { RootStackParamList } from 'types/screens/screens';

/**
 * Where signing in lands you.
 *
 * One definition for every way in — the email form, the sign-up form, and the
 * Google button — because the app has exactly one answer to "you are signed in
 * now, what should be on screen". Each path having its own answer is how the
 * Google button ended up with none at all: it signed the person in and left
 * them looking at the sign-in form, which reads as the sign-in having failed.
 */
export function useSignedIn(): () => void {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return useCallback(
    () => navigation.navigate('HomeTabNavigator', { screen: 'Routes' }),
    [navigation],
  );
}

export default useSignedIn;
