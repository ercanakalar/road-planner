/**
 * One spelling for a piece of text, for comparing it against another.
 *
 * Turkish has two i's and they do not survive an ASCII lowercase: "KADIKÖY"
 * and "Kadıköy" stop matching. Fold with the Turkish rules, then flatten both
 * i's together so either spelling of the same word collides.
 */
export const fold = (text: string): string =>
  text.toLocaleLowerCase('tr').replace(/ı/g, 'i');

/** Combining marks, left behind once NFD splits a letter from its accent. */
const COMBINING_MARKS = /\p{M}+/gu;

/**
 * The same, but with accents dropped too — for matching what someone typed
 * against what is stored.
 *
 * A phone's English keyboard has no ö or ş, and reaching for the Turkish one
 * mid-search is more trouble than the search is worth, so "kadikoy" has to
 * find "Kadıköy". That is right for a search box and wrong for deciding two
 * stored names are the same place, which is why `fold` stops short of it.
 */
export const foldForSearch = (text: string): string =>
  fold(text).normalize('NFD').replace(COMBINING_MARKS, '');
