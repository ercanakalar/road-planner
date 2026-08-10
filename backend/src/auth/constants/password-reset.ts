export const RESET_CODE_LENGTH = 5;

export const RESET_CODE_TTL_MINUTES = 15;

export const RESET_CODE_MAX_ATTEMPTS = 3;

export const RESET_CODE_LOCKOUT_HOURS = 24;

export const RESET_CODE_PATTERN = new RegExp(`^\\d{${RESET_CODE_LENGTH}}$`);
