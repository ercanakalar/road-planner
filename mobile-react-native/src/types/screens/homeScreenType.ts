import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './screens';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeTabNavigator'>;

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'HomeTabNavigator'>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
};

export { HomeScreenProps };
