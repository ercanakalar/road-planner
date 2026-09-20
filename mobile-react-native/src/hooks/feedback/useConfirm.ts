import { createContext, use } from 'react';

import { ConfirmOptions } from 'types/components/confirmModal';

export type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const confirm = use(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside a ConfirmProvider');
  }
  return confirm;
};

export default useConfirm;
