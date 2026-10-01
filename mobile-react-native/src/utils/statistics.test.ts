import { USAGE_FEATURES } from 'constants/usageFeatures';
import { countParts, trendOf } from './statistics';

describe('countParts', () => {
  it('writes a small count out in full, grouped the way each language does', () => {
    expect(countParts(1284, 'en')).toEqual({ kind: 'plain', text: '1,284' });
    expect(countParts(1284, 'tr')).toEqual({ kind: 'plain', text: '1.284' });
    expect(countParts(7, 'en')).toEqual({ kind: 'plain', text: '7' });
  });

  it('shortens a large count to thousands with one decimal', () => {
    expect(countParts(12_940, 'en')).toEqual({
      kind: 'thousands',
      value: '12.9',
    });
    expect(countParts(12_940, 'tr')).toEqual({
      kind: 'thousands',
      value: '12,9',
    });
  });

  it('drops a decimal that says nothing', () => {
    expect(countParts(20_000, 'en')).toEqual({ kind: 'thousands', value: '20' });
  });

  it('shortens a very large count to millions', () => {
    expect(countParts(4_210_000, 'en')).toEqual({
      kind: 'millions',
      value: '4.2',
    });
  });
});

describe('trendOf', () => {
  it('says nothing about a feature nobody used in either period', () => {
    expect(trendOf(0, 0)).toEqual({ kind: 'none' });
  });

  it('calls a feature new when the period before had none of it', () => {
    expect(trendOf(5, 0)).toEqual({ kind: 'new' });
  });

  it('notices a feature that stopped being used', () => {
    expect(trendOf(0, 5)).toEqual({ kind: 'gone' });
  });

  it('gives the change as a rounded percentage either way', () => {
    expect(trendOf(15, 10)).toEqual({ kind: 'up', percent: 50 });
    expect(trendOf(7, 10)).toEqual({ kind: 'down', percent: 30 });
  });

  it('calls a change that rounds to nothing no change', () => {
    expect(trendOf(1001, 1000)).toEqual({ kind: 'same' });
  });
});

describe('USAGE_FEATURES', () => {
  // The server's catalogue (src/statistics/usage-events.ts). A name added
  // there without a label here would show up as a raw identifier.
  const SERVER_EVENTS = [
    'account_signed_up',
    'account_signed_in',
    'route_created',
    'route_published',
    'route_copied',
    'route_deleted',
    'route_share_link_created',
    'route_share_link_opened',
    'route_terrain',
    'stop_added',
    'favorite_toggled',
    'author_follow_toggled',
    'search_routes',
    'search_people',
    'maps_directions',
    'maps_place_selected',
    'maps_along_route_search',
    'travel_map_lookup',
    'app_opened',
    'map_local_route_created',
    'map_google_import',
    'map_opened_in_google_maps',
    'travel_map_area_marked',
  ];

  it('has words and an icon for every feature the server counts', () => {
    expect(Object.keys(USAGE_FEATURES).sort()).toEqual([...SERVER_EVENTS].sort());
  });

  it('names every feature through a translation', () => {
    Object.values(USAGE_FEATURES).forEach(({ label }) => {
      expect(label).toMatch(/^statistics\.feature[A-Z]/);
    });
  });
});
