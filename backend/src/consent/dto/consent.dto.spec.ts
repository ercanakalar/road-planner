import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import { GrantConsentDto, WithdrawConsentDto } from './consent.dto';

const GRANT = {
  noticeVersion: '2026-10-01',
  language: 'tr',
  acceptedAt: '2026-09-30T08:00:00.000Z',
};

describe('GrantConsentDto', () => {
  it('accepts what the app sends after a sign-in', async () => {
    await expect(validateDto(GrantConsentDto, GRANT)).resolves.toEqual(GRANT);
  });

  it.each([
    ['a version that is not a date', { noticeVersion: 'v2' }],
    ['a language the notice is not written in', { language: 'de' }],
    ['a moment that is not a date', { acceptedAt: 'yesterday' }],
  ])('refuses %s', async (_label, change) => {
    await expect(
      collectDtoErrors(GrantConsentDto, { ...GRANT, ...change }),
    ).resolves.not.toEqual([]);
  });
});

describe('WithdrawConsentDto', () => {
  it('needs the version being withdrawn and the language it was read in', async () => {
    await expect(collectDtoErrors(WithdrawConsentDto, {})).resolves.not.toEqual(
      [],
    );
  });

  it('accepts a well-formed withdrawal', async () => {
    await expect(
      validateDto(WithdrawConsentDto, {
        noticeVersion: '2026-10-01',
        language: 'en',
      }),
    ).resolves.toEqual({ noticeVersion: '2026-10-01', language: 'en' });
  });
});
