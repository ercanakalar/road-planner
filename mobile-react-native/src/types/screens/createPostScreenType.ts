import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './screens';

type CreatePostScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CreatePost'
>;

type CreatePostScreenRouteProp = RouteProp<
  RootStackParamList,
  'CreatePost'
>;

type CreatePostScreenProps = {
  navigation: CreatePostScreenNavigationProp;
  route: CreatePostScreenRouteProp;
};

export { CreatePostScreenProps };
