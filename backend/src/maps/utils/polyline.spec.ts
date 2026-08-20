import { decodePolyline } from './polyline';

const GOOGLE_EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const round = (value: number) => Math.round(value * 1e5) / 1e5;

const rounded = (points: { latitude: number; longitude: number }[]) =>
  points.map(({ latitude, longitude }) => [round(latitude), round(longitude)]);

describe('decodePolyline', () => {
  it('decodes the reference polyline from Google documentation', () => {
    expect(rounded(decodePolyline(GOOGLE_EXAMPLE))).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });

  it('decodes a single point', () => {
    expect(rounded(decodePolyline('_p~iF~ps|U'))).toEqual([[38.5, -120.2]]);
  });

  it('applies deltas cumulatively rather than absolutely', () => {
    const points = decodePolyline(GOOGLE_EXAMPLE);

    expect(points[1].latitude).toBeGreaterThan(points[0].latitude);
    expect(points[2].latitude).toBeGreaterThan(points[1].latitude);
  });

  it('keeps six decimal places of precision', () => {
    expect(decodePolyline(GOOGLE_EXAMPLE)[2].latitude).toBeCloseTo(43.252, 5);
  });

  it('returns nothing for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('stops at a truncated chunk rather than emitting a bogus point', () => {
    expect(decodePolyline('_p~iF')).toEqual([]);
  });
});
