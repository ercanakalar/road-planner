import { createContext, use } from 'react';

import { ConfirmOptions } from 'types/components/confirmModal';

export type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

/**
 * Filled in by `ConfirmProvider`. It lives here rather than beside the provider
 * so a hook can ask for a confirmation without importing a component.
 */
export const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Asks the user to confirm something, and resolves to what they chose. */
export const useConfirm = (): ConfirmFn => {
  const confirm = use(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside a ConfirmProvider');
  }
  return confirm;
};

export default useConfirm;
