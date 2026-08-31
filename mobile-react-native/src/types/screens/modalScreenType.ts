import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './screens';

type ModalScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Modal'
>;

type ModalScreenRouteProp = RouteProp<RootStackParamList, 'Modal'>;

type ModalScreenProps = {
  navigation: ModalScreenNavigationProp;
  route: ModalScreenRouteProp;
};

export { ModalScreenProps };
