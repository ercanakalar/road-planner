import { withAlpha } from './color';

describe('withAlpha', () => {
  it('turns a six digit hex into a colour a polyline can fade', () => {
    expect(withAlpha('#2563EB', 0.6)).toBe('rgba(37, 99, 235, 0.6)');
  });

  it('reads a three digit hex as its expanded form', () => {
    expect(withAlpha('#09F', 0.5)).toBe('rgba(0, 153, 255, 0.5)');
  });

  it('does not care about the case of the digits', () => {
    expect(withAlpha('#2563eb', 0.6)).toBe(withAlpha('#2563EB', 0.6));
  });

  it('keeps a fully opaque colour fully opaque', () => {
    expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
  });

  it('holds an alpha outside the scale to the ends of it', () => {
    expect(withAlpha('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
  });

  it('hands back anything that is not plain hex untouched', () => {
    expect(withAlpha('rgba(15, 23, 42, 0.45)', 0.6)).toBe(
      'rgba(15, 23, 42, 0.45)',
    );
    expect(withAlpha('transparent', 0.6)).toBe('transparent');
    expect(withAlpha('#12345', 0.6)).toBe('#12345');
  });
});
