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

  // Signed out, this tab is the app's front door rather than a bare form: the
  // welcome screen says what an account buys you, and pushes the form when
  // someone wants one.
  return isLoggedIn ? (
    <ProfileScreen navigation={navigation} />
  ) : (
    <WelcomeScreen navigation={navigation} />
  );
};

export default AuthGate;
