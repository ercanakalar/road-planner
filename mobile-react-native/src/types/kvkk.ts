export type KvkkLanguage = 'tr' | 'en';

export const isKvkkLanguage = (value: unknown): value is KvkkLanguage =>
  value === 'tr' || value === 'en';

export type KvkkSectionId =
  | 'controller'
  | 'data'
  | 'purpose'
  | 'legalBasis'
  | 'sharing'
  | 'retention'
  | 'rights'
  | 'withdrawal';

export interface KvkkSection {
  id: KvkkSectionId;
  title: string;
  body: string;
}

/**
 * Every string the KVKK surfaces render. The notice is the one part of the app
 * that is bilingual: KVKK is Turkish law and the Turkish wording is the one
 * that binds, but the rest of the app speaks English and a wall of text nobody
 * can read is not consent.
 */
export interface KvkkCopy {
  languageLabel: string;
  title: string;
  subtitle: string;
  updatedLabel: string;
  sections: KvkkSection[];
  bindingNote: string;
  consentStatement: string;
  acceptLabel: string;
  declineLabel: string;
  declinedTitle: string;
  declinedBody: string;
  declinedBackLabel: string;
  updatedNotice: string;
  statusTitle: string;
  acceptedOnLabel: string;
  versionLabel: string;
  withdrawLabel: string;
  withdrawTitle: string;
  withdrawMessage: string;
  withdrawConfirmLabel: string;
  withdrawCancelLabel: string;
}

/** What is written to the device once the notice is accepted. */
export interface KvkkConsentRecord {
  version: string;
  acceptedAt: string;
  language: KvkkLanguage;
}

export const isKvkkConsentRecord = (
  value: unknown,
): value is KvkkConsentRecord => {
  const record = value as KvkkConsentRecord | undefined;
  return (
    !!record &&
    typeof record.version === 'string' &&
    record.version.length > 0 &&
    typeof record.acceptedAt === 'string' &&
    isKvkkLanguage(record.language)
  );
};
