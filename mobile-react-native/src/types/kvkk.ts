export type KvkkLanguage = 'tr' | 'en';

const isKvkkLanguage = (value: unknown): value is KvkkLanguage =>
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

interface KvkkSection {
  id: KvkkSectionId;
  title: string;
  body: string;
}

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
