export const fold = (text: string): string =>
  text.toLocaleLowerCase('tr').replace(/ı/g, 'i');

const COMBINING_MARKS = /\p{M}+/gu;

export const foldForSearch = (text: string): string =>
  fold(text).normalize('NFD').replace(COMBINING_MARKS, '');
