import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { KVKK_CONSENT_VERSION } from 'constants/kvkk';
import { KvkkConsentRecord } from 'types/kvkk';

interface KvkkState {
  /** False until the stored consent has been read off the device. */
  isHydrated: boolean;
  consent: KvkkConsentRecord | null;
}

export const kvkkInitialState: KvkkState = {
  isHydrated: false,
  consent: null,
};

export const kvkkSlice = createSlice({
  name: 'kvkk',
  initialState: kvkkInitialState,
  reducers: {
    kvkkHydrated(state, action: PayloadAction<KvkkConsentRecord | null>) {
      state.consent = action.payload;
      state.isHydrated = true;
    },
    kvkkAccepted(state, action: PayloadAction<KvkkConsentRecord>) {
      state.consent = action.payload;
      state.isHydrated = true;
    },
    kvkkWithdrawn(state) {
      state.consent = null;
    },
  },
});

/** A consent counts only while it names the notice the app would show today. */
export const isKvkkConsentCurrent = (
  consent: KvkkConsentRecord | null,
  version: string = KVKK_CONSENT_VERSION,
): boolean => consent?.version === version;

type KvkkAware = { kvkk: KvkkState };

export const selectKvkkConsent = (state: KvkkAware) => state.kvkk.consent;

export const selectIsKvkkConsentRequired = (state: KvkkAware): boolean =>
  state.kvkk.isHydrated && !isKvkkConsentCurrent(state.kvkk.consent);

export const { kvkkHydrated, kvkkAccepted, kvkkWithdrawn } = kvkkSlice.actions;

export default kvkkSlice.reducer;
