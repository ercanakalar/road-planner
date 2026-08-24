import reducer, {
  isKvkkConsentCurrent,
  kvkkAccepted,
  kvkkHydrated,
  kvkkInitialState,
  kvkkWithdrawn,
  selectIsKvkkConsentRequired,
  selectKvkkConsent,
} from './kvkkSlice';
import { KVKK_CONSENT_VERSION } from 'constants/kvkk';
import { KvkkConsentRecord } from 'types/kvkk';

const consent = (
  overrides: Partial<KvkkConsentRecord> = {},
): KvkkConsentRecord => ({
  version: KVKK_CONSENT_VERSION,
  acceptedAt: '2026-08-24T09:00:00.000Z',
  language: 'tr',
  ...overrides,
});

describe('kvkkSlice', () => {
  it('starts unhydrated with no consent', () => {
    expect(reducer(undefined, { type: '@@init' })).toEqual({
      isHydrated: false,
      consent: null,
    });
  });

  it('marks itself hydrated even when the device holds no consent', () => {
    const state = reducer(undefined, kvkkHydrated(null));

    expect(state).toEqual({ isHydrated: true, consent: null });
  });

  it('keeps the consent read off the device', () => {
    const state = reducer(undefined, kvkkHydrated(consent()));

    expect(state.consent).toEqual(consent());
    expect(state.isHydrated).toBe(true);
  });

  it('records an acceptance', () => {
    const record = consent({ language: 'en' });
    const state = reducer(kvkkInitialState, kvkkAccepted(record));

    expect(state.consent).toEqual(record);
  });

  it('drops the consent when it is withdrawn', () => {
    const accepted = reducer(kvkkInitialState, kvkkAccepted(consent()));

    const state = reducer(accepted, kvkkWithdrawn());

    expect(state.consent).toBeNull();
    expect(state.isHydrated).toBe(true);
  });
});

describe('isKvkkConsentCurrent', () => {
  it('accepts a consent given for the version on show', () => {
    expect(isKvkkConsentCurrent(consent())).toBe(true);
  });

  it('rejects a consent given for an older notice', () => {
    expect(isKvkkConsentCurrent(consent({ version: '2020-01-01' }))).toBe(
      false,
    );
  });

  it('rejects a missing consent', () => {
    expect(isKvkkConsentCurrent(null)).toBe(false);
  });
});

describe('selectIsKvkkConsentRequired', () => {
  it('asks for nothing until the device has been read', () => {
    expect(selectIsKvkkConsentRequired({ kvkk: kvkkInitialState })).toBe(false);
  });

  it('asks once a hydrated device turns out to hold no consent', () => {
    const kvkk = reducer(undefined, kvkkHydrated(null));

    expect(selectIsKvkkConsentRequired({ kvkk })).toBe(true);
  });

  it('asks again after the notice text changes', () => {
    const kvkk = reducer(undefined, kvkkHydrated(consent({ version: 'old' })));

    expect(selectIsKvkkConsentRequired({ kvkk })).toBe(true);
    expect(selectKvkkConsent({ kvkk })?.version).toBe('old');
  });

  it('stops asking once the current notice is accepted', () => {
    const hydrated = reducer(undefined, kvkkHydrated(null));
    const kvkk = reducer(hydrated, kvkkAccepted(consent()));

    expect(selectIsKvkkConsentRequired({ kvkk })).toBe(false);
  });

  it('asks again the moment the consent is withdrawn', () => {
    const accepted = reducer(undefined, kvkkAccepted(consent()));
    const kvkk = reducer(accepted, kvkkWithdrawn());

    expect(selectIsKvkkConsentRequired({ kvkk })).toBe(true);
  });
});
