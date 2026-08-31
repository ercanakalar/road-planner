import { ViewStyle } from 'react-native';
import { RootStackParamList } from '../screens/screens';

type GoToButtonProps = {
  screenName: keyof RootStackParamList;
  style: ViewStyle;
};

export { GoToButtonProps };
