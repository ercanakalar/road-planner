import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';

import { ConfirmContext, ConfirmFn } from 'hooks/feedback/useConfirm';
import ConfirmModal from './ConfirmModal';
import type { ConfirmOptions } from 'types/components/confirmModal';

/**
 * Holds the one confirmation dialog the app shows, and hands every screen and
 * hook below it a promise-shaped way to raise it.
 */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback<ConfirmFn>((next = {}) => {
    resolveRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => settle(true), [settle]);
  const handleCancel = useCallback(() => settle(false), [settle]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext value={value}>
      {children}
      <ConfirmModal
        visible={options !== null}
        {...options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext>
  );
};

export default ConfirmProvider;
