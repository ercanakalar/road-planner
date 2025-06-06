import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

interface ShowNotificationOptions {
  type?: ToastType;
  text1: string;
  text2?: string;
  visibilityTime?: number;
  position?: 'top' | 'bottom';
  topOffset?: number;
}

export function showNotification({
  type = 'info',
  text1,
  text2,
  visibilityTime = 3000,
  position = 'top',
  topOffset = 50,
}: ShowNotificationOptions) {
  // ToastAndroid.show(text1, ToastAndroid.SHORT);
  Toast.show({
    type,
    text1,
    text2,
    visibilityTime,
    position,
    autoHide: true,
    topOffset,
    onPress() {
      Toast.hide();
    },
  });
}
