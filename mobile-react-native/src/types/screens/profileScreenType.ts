import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './screens';

export type UserProfile = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  photo?: string;
  nickName?: string;
};

export interface ProfileScreenProps {
  navigation: NavigationProp<RootStackParamList, 'ProfileScreen'>;
  route: RouteProp<RootStackParamList, 'ProfileScreen'>;
}
