import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

interface ShowNotificationOptions {
  type?: ToastType;
  header: string;
  message?: string;
  visibilityTime?: number;
  position?: 'top' | 'bottom';
  topOffset?: number;
}

export function showNotification({
  type = 'info',
  header,
  message,
  visibilityTime = 1000,
  position = 'top',
  topOffset = 50,
}: ShowNotificationOptions) {
  // ToastAndroid.show(header, ToastAndroid.SHORT);
  Toast.show({
    type,
    text1: header,
    text2: message,
    visibilityTime,
    position,
    autoHide: true,
    topOffset,
    onPress() {
      Toast.hide();
    },
  });
}
