import { HttpException } from '@nestjs/common';

const HTTP_LOCKED = 423;

export class PasswordResetLockedException extends HttpException {
  constructor(lockedUntil: Date) {
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil((lockedUntil.getTime() - Date.now()) / 1000),
    );

    super(
      {
        statusCode: HTTP_LOCKED,
        error: 'PASSWORD_RESET_LOCKED',
        message:
          'Too many incorrect codes. Password reset is locked for this account.',
        retryAfterSeconds,
        lockedUntil: lockedUntil.toISOString(),
      },
      HTTP_LOCKED,
    );
  }
}
