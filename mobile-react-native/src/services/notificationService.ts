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

let notificationsEnabled = true;

export const setNotificationsEnabled = (enabled: boolean) => {
  notificationsEnabled = enabled;
};

export const areNotificationsEnabled = () => notificationsEnabled;

export function showNotification({
  type = 'info',
  header,
  message,
  visibilityTime = 1000,
  position = 'top',
  topOffset = 50,
}: ShowNotificationOptions) {
  if (!notificationsEnabled) return;

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
