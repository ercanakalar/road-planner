import { useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';

import { showNotification } from 'services/notificationService';
import { fullAddress } from 'utils/address';

/**
 * Puts a stop's address on the clipboard, cleaned of the noise a stored address
 * can carry, and says so — a copy with no feedback reads as a dead button.
 */
export function useCopyAddress() {
  return useCallback(async (address: string | undefined | null) => {
    const text = fullAddress(address);

    if (!text) {
      showNotification({
        type: 'info',
        header: 'Nothing to copy',
        message: 'This stop has no address yet.',
      });
      return;
    }

    try {
      await Clipboard.setStringAsync(text);
      showNotification({
        type: 'success',
        header: 'Address copied',
        message: text,
      });
    } catch {
      showNotification({
        type: 'error',
        header: 'Error',
        message: 'Could not copy that address.',
      });
    }
  }, []);
}

export default useCopyAddress;
