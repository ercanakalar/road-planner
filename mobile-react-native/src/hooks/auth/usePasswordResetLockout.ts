import { useEffect, useState } from 'react';

import passwordResetLockout from 'services/passwordResetLockout';

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
