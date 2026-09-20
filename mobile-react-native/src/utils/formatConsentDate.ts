import { KvkkLanguage } from 'types/kvkk';

const LOCALES: Record<KvkkLanguage, string> = { tr: 'tr-TR', en: 'en-GB' };

export const formatConsentDate = (
  iso: string,
  language: KvkkLanguage,
): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  try {
    return date.toLocaleDateString(LOCALES[language], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
};

export default formatConsentDate;
