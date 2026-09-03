import { fold, foldForSearch } from './text';

describe('fold', () => {
  it('lowercases', () => {
    expect(fold('Coast Run')).toBe('coast run');
  });

  it('folds both Turkish i spellings onto the same letter', () => {
    // "KADIKÖY" lowercases to "kadıköy" in Turkish, not "kadiköy".
    expect(fold('KADIKÖY')).toBe(fold('Kadıköy'));
    expect(fold('İSTANBUL')).toBe(fold('İstanbul'));
  });

  it('keeps accents, which say which word this is', () => {
    expect(fold('Kadıköy')).toBe('kadiköy');
  });
});

describe('foldForSearch', () => {
  it('drops accents so an English keyboard can type the word', () => {
    expect(foldForSearch('Kadıköy')).toBe('kadikoy');
    expect(foldForSearch('Şişli')).toBe('sisli');
    expect(foldForSearch('Beşiktaş')).toBe(foldForSearch('besiktas'));
  });

  it('leaves a word with no accents alone', () => {
    expect(foldForSearch('Airport run')).toBe('airport run');
  });
});
