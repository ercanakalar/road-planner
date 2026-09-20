import { useCallback } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import { RootStackParamList } from 'types/screens/screens';

export function useSignedIn(): () => void {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return useCallback(
    () => navigation.navigate('HomeTabNavigator', { screen: 'Routes' }),
    [navigation],
  );
}

export default useSignedIn;
