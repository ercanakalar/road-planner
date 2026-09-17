import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';

import { showNotification } from 'services/notificationService';
import { fullAddress } from 'utils/address';

/**
 * Puts a stop's address on the clipboard, cleaned of the noise a stored address
 * can carry, and says so — a copy with no feedback reads as a dead button.
 */
export function useCopyAddress() {
  const { t } = useTranslation();

  return useCallback(
    async (address: string | undefined | null) => {
      const text = fullAddress(address);

      if (!text) {
        showNotification({
          type: 'info',
          header: t('toast.nothingToCopy'),
          message: t('toast.noAddressYet'),
        });
        return;
      }

      try {
        await Clipboard.setStringAsync(text);
        showNotification({
          type: 'success',
          header: t('toast.addressCopied'),
          message: text,
        });
      } catch {
        showNotification({
          type: 'error',
          header: t('toast.error'),
          message: t('toast.couldNotCopy'),
        });
      }
    },
    [t],
  );
}

export default useCopyAddress;
