import { createAction } from '@reduxjs/toolkit';

export const sessionRefreshed = createAction<{
  accessToken: string;
  refreshToken: string;
}>('session/refreshed');

export const sessionCleared = createAction('session/cleared');
