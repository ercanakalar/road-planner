export const COLLECTION_PAGE_SIZE = 200;

export const DISCOVER_PAGE_SIZE = 5;
export const DISCOVER_REFRESH_MS = 60_000;

/**
 * One screenful of search results and then some. Search is typed into, so the
 * page has to come back fast; the API pages, and asking for more than can be
 * read before the next keystroke only slows the answer down.
 */
export const SEARCH_PAGE_SIZE = 30;
