import {
  addressLocality,
  addressName,
  fullAddress,
  splitAddress,
} from './address';

const FULL = 'Bağdat Cd. 1, Kadıköy, İstanbul, Türkiye';

describe('splitAddress', () => {
  it('names the place from the first segment', () => {
    expect(addressName(FULL)).toBe('Bağdat Cd. 1');
  });

  it('drops the country from the locality line', () => {
    // Every stop on a domestic route repeats it, so it earns no room.
    expect(addressLocality(FULL)).toBe('Kadıköy, İstanbul');
  });

  it('keeps the second segment when there are only two', () => {
    expect(splitAddress('Konak, İzmir')).toEqual({
      primary: 'Konak',
      secondary: 'İzmir',
    });
  });

  it('leaves nothing for a locality when the address says one thing', () => {
    expect(splitAddress('Sultanahmet')).toEqual({
      primary: 'Sultanahmet',
      secondary: '',
    });
  });

  it('treats a bare dropped pin as having no address at all', () => {
    expect(splitAddress('')).toEqual({ primary: '', secondary: '' });
    expect(splitAddress(undefined)).toEqual({ primary: '', secondary: '' });
    expect(splitAddress(null)).toEqual({ primary: '', secondary: '' });
  });

  it('ignores the empty segments a trailing comma leaves', () => {
    expect(splitAddress('Konak, , İzmir,')).toEqual({
      primary: 'Konak',
      secondary: 'İzmir',
    });
  });

  it('trims the space after each comma', () => {
    expect(splitAddress('  Konak ,  İzmir  ').primary).toBe('Konak');
  });
});

describe('garbage in the stored address', () => {
  // Rows written before the API cleaned addresses, and routes carried off a
  // phone, still hold whatever they were saved with.

  it('drops a Plus Code standing in for a street name', () => {
    expect(splitAddress('7GXR+8C, Kadıköy, İstanbul')).toEqual({
      primary: 'Kadıköy',
      secondary: 'İstanbul',
    });
  });

  it('drops a Plus Code but keeps the place sharing its segment', () => {
    // What Google returns for a pin off a named road: the code and the
    // locality in one segment, no comma between them.
    expect(splitAddress('7GXR+8C Kadıköy, İstanbul, Türkiye')).toEqual({
      primary: 'Kadıköy',
      secondary: 'İstanbul',
    });
  });

  it('leaves a plus alone when it is part of a name', () => {
    expect(addressName('Blok A+B, Kadıköy')).toBe('Blok A+B');
  });

  it('drops an unnamed road', () => {
    expect(addressName('Unnamed Road, Kadıköy')).toBe('Kadıköy');
    expect(addressName('İsimsiz Yol, Konak')).toBe('Konak');
  });

  it('drops a postcode on its own but keeps one attached to a town', () => {
    expect(addressName('34710, Kadıköy')).toBe('Kadıköy');
    expect(addressName('34710 Kadıköy, İstanbul')).toBe('34710 Kadıköy');
  });

  it('says a repeated segment once, across both Turkish i spellings', () => {
    expect(fullAddress('KADIKÖY, Kadıköy, İstanbul')).toBe('KADIKÖY, İstanbul');
  });

  it('drops segments that are only punctuation', () => {
    expect(fullAddress('---, Kadıköy, -, İstanbul')).toBe('Kadıköy, İstanbul');
  });

  it('shows nothing at all when every segment was noise', () => {
    expect(splitAddress('7GXR+8C, Unnamed Road, 34710')).toEqual({
      primary: '',
      secondary: '',
    });
  });

  it('survives a value that is not a string', () => {
    expect(splitAddress({ address: 'Kadıköy' } as unknown as string)).toEqual({
      primary: '',
      secondary: '',
    });
  });
});

describe('fullAddress', () => {
  it('keeps the country, which the subtitle drops', () => {
    // Someone pasting this into a maps app wants the whole thing.
    expect(fullAddress('Bağdat Cd. 1, Kadıköy, İstanbul, Türkiye')).toBe(
      'Bağdat Cd. 1, Kadıköy, İstanbul, Türkiye',
    );
  });

  it('is empty for a stop that was never named', () => {
    expect(fullAddress('')).toBe('');
  });
});
