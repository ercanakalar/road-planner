import { createHmac } from 'crypto';

// The deletion log keeps an e-mail address only as this keyed hash. Given the
// address, the same key finds the record again — enough to answer "did you
// delete my account?" — while the log itself no longer says whose it was.
export const hashEmail = (email: string, key: string): string =>
  createHmac('sha256', key).update(email.trim().toLowerCase()).digest('hex');
