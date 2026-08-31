import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './screens';

interface ProfileDetailScreenProps {
  navigation: NavigationProp<RootStackParamList, 'ProfileDetailScreen'>;
  route: RouteProp<RootStackParamList, 'ProfileDetailScreen'>;
}

export { ProfileDetailScreenProps };
