import { IsIn, IsISO8601, IsString, Matches } from 'class-validator';

import { AppLanguage, SUPPORTED_LANGUAGES } from 'src/i18n/languages';

// The app names each revision of its KVKK notice by the date it took effect.
export const NOTICE_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class GrantConsentDto {
  @IsString()
  @Matches(NOTICE_VERSION_PATTERN)
  noticeVersion!: string;

  @IsIn([...SUPPORTED_LANGUAGES])
  language!: AppLanguage;

  // When the person accepted, which is usually before they signed in: the
  // notice is accepted on first launch, the account comes later.
  @IsISO8601({ strict: true })
  acceptedAt!: string;
}

export class WithdrawConsentDto {
  @IsString()
  @Matches(NOTICE_VERSION_PATTERN)
  noticeVersion!: string;

  @IsIn([...SUPPORTED_LANGUAGES])
  language!: AppLanguage;
}
