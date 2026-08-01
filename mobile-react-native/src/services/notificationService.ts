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

/*
 * Mirrors `settings.notificationsEnabled`.
 *
 * A module-level flag rather than a store read: `showNotification` is called
 * from response transforms and other non-React code that has no access to a
 * hook, and importing the store here would make a cycle. `settingsMiddleware`
 * pushes the value in whenever the preference changes or is restored.
 */
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
