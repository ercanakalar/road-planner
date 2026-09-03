import { cleanAddress } from './address';

describe('cleanAddress', () => {
  it('leaves a well-formed address alone', () => {
    expect(cleanAddress('Bağdat Cd. 1, Kadıköy, İstanbul, Türkiye')).toBe(
      'Bağdat Cd. 1, Kadıköy, İstanbul, Türkiye',
    );
  });

  describe('segments that name nothing', () => {
    it('drops a Plus Code', () => {
      // Google puts one where the street name would be for a pin off a road.
      expect(cleanAddress('7GXR+8C, Kadıköy, İstanbul')).toBe(
        'Kadıköy, İstanbul',
      );
    });

    it('drops a Plus Code with an area suffix in its own segment', () => {
      expect(cleanAddress('CFGH+2VW, Konak, İzmir')).toBe('Konak, İzmir');
    });

    it('drops a Plus Code but keeps the place sharing its segment', () => {
      // This is the shape Google actually returns for a pin off a named road:
      // the code and the locality in one segment, no comma between them.
      expect(cleanAddress('7GXR+8C Kadıköy, İstanbul, Türkiye')).toBe(
        'Kadıköy, İstanbul, Türkiye',
      );
    });

    it('leaves a plus alone when it is part of a name', () => {
      expect(cleanAddress('Blok A+B, Kadıköy')).toBe('Blok A+B, Kadıköy');
    });

    it('drops an unnamed road, in either language', () => {
      expect(cleanAddress('Unnamed Road, Kadıköy')).toBe('Kadıköy');
      expect(cleanAddress('İsimsiz Yol, Konak')).toBe('Konak');
    });

    it('drops a postcode standing on its own', () => {
      expect(cleanAddress('34710, Kadıköy, İstanbul')).toBe(
        'Kadıköy, İstanbul',
      );
    });

    it('keeps a postcode attached to the place it belongs to', () => {
      expect(cleanAddress('34710 Kadıköy, İstanbul')).toBe(
        '34710 Kadıköy, İstanbul',
      );
    });

    it('keeps a street number, which is not a postcode', () => {
      expect(cleanAddress('Bağdat Cd. 1, Kadıköy')).toBe(
        'Bağdat Cd. 1, Kadıköy',
      );
    });

    it('drops a segment that is only punctuation', () => {
      expect(cleanAddress('---, Kadıköy, -, İstanbul')).toBe(
        'Kadıköy, İstanbul',
      );
    });
  });

  describe('shape', () => {
    it('drops empty segments left by stray commas', () => {
      expect(cleanAddress('Kadıköy, , İstanbul,')).toBe('Kadıköy, İstanbul');
    });

    it('collapses runs of whitespace', () => {
      expect(cleanAddress('  Bağdat   Cd.  1 ,   Kadıköy ')).toBe(
        'Bağdat Cd. 1, Kadıköy',
      );
    });

    it('strips control characters rather than storing them', () => {
      expect(cleanAddress('Kadıköy\u0000\u001F, İstanbul')).toBe(
        'Kadıköy, İstanbul',
      );
    });

    it('says a repeated segment once', () => {
      expect(cleanAddress('Kadıköy, Kadıköy, İstanbul')).toBe(
        'Kadıköy, İstanbul',
      );
    });

    it('treats a repeat in another case as the same segment', () => {
      expect(cleanAddress('KADIKÖY, Kadıköy, İstanbul')).toBe(
        'KADIKÖY, İstanbul',
      );
    });

    it('keeps a repeat that is genuinely a different place', () => {
      expect(cleanAddress('İstanbul Cd., Kadıköy, İstanbul')).toBe(
        'İstanbul Cd., Kadıköy, İstanbul',
      );
    });
  });

  describe('input that is not an address at all', () => {
    it('returns nothing for a value that is not text', () => {
      expect(cleanAddress(undefined)).toBe('');
      expect(cleanAddress(null)).toBe('');
      expect(cleanAddress(42)).toBe('');
      expect(cleanAddress({ address: 'Kadıköy' })).toBe('');
    });

    it('returns nothing when every segment was noise', () => {
      expect(cleanAddress('7GXR+8C, Unnamed Road, 34710')).toBe('');
    });

    it('returns nothing for whitespace and commas', () => {
      expect(cleanAddress('  , , ')).toBe('');
    });
  });

  describe('length', () => {
    it('cuts on a segment boundary rather than mid-word', () => {
      const long = Array.from({ length: 40 }, (_, i) => `Segment ${i}`).join(
        ', ',
      );
      const result = cleanAddress(long);

      expect(result.length).toBeLessThanOrEqual(300);
      expect(result.startsWith('Segment 0, Segment 1')).toBe(true);
      // Every segment kept is a whole one — nothing is cut through.
      result
        .split(', ')
        .forEach((segment) => expect(segment).toMatch(/^Segment \d+$/));
    });

    it('still returns something when the first segment alone is too long', () => {
      const result = cleanAddress('x'.repeat(500));

      expect(result).toHaveLength(300);
    });
  });
});
