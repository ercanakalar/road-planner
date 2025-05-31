import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './screens';

type DetailsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Details'
>;

type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;

type DetailsScreenProps = {
  navigation: DetailsScreenNavigationProp;
  route: DetailsScreenRouteProp;
};

export { DetailsScreenProps };
