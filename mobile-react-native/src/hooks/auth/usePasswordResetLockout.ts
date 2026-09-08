import { useEffect, useState } from 'react';

import passwordResetLockout from 'services/passwordResetLockout';

/**
 * How much longer this address is locked out of password resets, or 0 when it
 * is not. Only a well-formed address is worth asking about, so the check is
 * skipped while one is still being typed.
 */
export function usePasswordResetLockout(email: string, isValid: boolean) {
  const [lockoutMs, setLockoutMs] = useState(0);

  useEffect(() => {
    if (!isValid) {
      setLockoutMs(0);
      return;
    }

    let cancelled = false;

    passwordResetLockout.remainingMs(email).then((remaining) => {
      if (!cancelled) setLockoutMs(remaining);
    });

    return () => {
      cancelled = true;
    };
  }, [email, isValid]);

  return lockoutMs;
}

export default usePasswordResetLockout;
