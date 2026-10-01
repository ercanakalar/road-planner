import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import {
  OVERVIEW_DEFAULT_DAYS,
  OverviewQueryDto,
  REPORT_MAX_EVENTS,
  ReportUsageDto,
} from './statistics.dto';

describe('ReportUsageDto', () => {
  it('accepts a batch of on-device events', async () => {
    await expect(
      validateDto(ReportUsageDto, {
        events: [
          { name: 'app_opened', detail: 'android' },
          { name: 'travel_map_area_marked', detail: 'city' },
          { name: 'map_google_import' },
        ],
      }),
    ).resolves.toMatchObject({ events: expect.any(Array) });
  });

  it('refuses an event the server records itself, so the app cannot inflate it', async () => {
    await expect(
      collectDtoErrors(ReportUsageDto, { events: [{ name: 'route_created' }] }),
    ).resolves.not.toEqual([]);
  });

  it('refuses an event nobody has defined', async () => {
    await expect(
      collectDtoErrors(ReportUsageDto, {
        events: [{ name: 'anything_at_all' }],
      }),
    ).resolves.not.toEqual([]);
  });

  it.each([
    ['free text', 'Kadıköy, İstanbul'],
    ['coordinates', '40.99,29.02'],
    ['a long value', 'x'.repeat(33)],
  ])('refuses a detail carrying %s', async (_label, detail) => {
    await expect(
      collectDtoErrors(ReportUsageDto, {
        events: [{ name: 'app_opened', detail }],
      }),
    ).resolves.not.toEqual([]);
  });

  it('refuses an empty batch and an oversized one', async () => {
    await expect(
      collectDtoErrors(ReportUsageDto, { events: [] }),
    ).resolves.not.toEqual([]);

    await expect(
      collectDtoErrors(ReportUsageDto, {
        events: Array.from({ length: REPORT_MAX_EVENTS + 1 }, () => ({
          name: 'app_opened',
        })),
      }),
    ).resolves.not.toEqual([]);
  });
});

describe('OverviewQueryDto', () => {
  it('defaults to the last 30 days', async () => {
    await expect(validateDto(OverviewQueryDto, {})).resolves.toEqual({
      days: OVERVIEW_DEFAULT_DAYS,
    });
  });

  it('reads the number of days from the query string', async () => {
    await expect(validateDto(OverviewQueryDto, { days: '7' })).resolves.toEqual(
      {
        days: 7,
      },
    );
  });

  it.each(['0', '366', '2.5', 'week'])('refuses %p days', async (days) => {
    await expect(
      collectDtoErrors(OverviewQueryDto, { days }),
    ).resolves.not.toEqual([]);
  });
});
