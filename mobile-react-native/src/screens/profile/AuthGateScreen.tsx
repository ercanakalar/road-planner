import { NavigationProp } from '@react-navigation/native';

import { useAppSelector } from 'store/hook';
import WelcomeScreen from './WelcomeScreen';
import ProfileScreen from './ProfileScreen';
import { RootStackParamList } from 'types/screens/screens';

const AuthGate = ({
  navigation,
}: {
  navigation: NavigationProp<RootStackParamList>;
}) => {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  return isLoggedIn ? (
    <ProfileScreen navigation={navigation} />
  ) : (
    <WelcomeScreen navigation={navigation} />
  );
};

export default AuthGate;
