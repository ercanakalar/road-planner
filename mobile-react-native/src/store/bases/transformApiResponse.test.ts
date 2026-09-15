import { transformApiPage, transformApiResponse } from './transformApiResponse';

describe('transformApiResponse', () => {
  it('unwraps the envelope', () => {
    expect(transformApiResponse({ status: 'success', data: { id: 'r1' } })).toEqual(
      { id: 'r1' },
    );
  });
});

describe('transformApiPage', () => {
  const envelope = {
    status: 'success',
    data: [{ id: 'r1' }, { id: 'r2' }],
    meta: { total: 312, limit: 30, offset: 0, hasMore: true },
  };

  it('keeps the rows', () => {
    expect(transformApiPage(envelope).items).toEqual([
      { id: 'r1' },
      { id: 'r2' },
    ]);
  });

  it('keeps the unpaged total, which is what a filter is about', () => {
    // Two rows are on screen; three hundred and twelve matched. The second
    // number is the one worth showing next to the filters.
    expect(transformApiPage(envelope).total).toBe(312);
  });

  it('keeps whether there is more to ask for', () => {
    expect(transformApiPage(envelope).hasMore).toBe(true);
  });

  it('reads an envelope with no meta as one complete page', () => {
    const page = transformApiPage({ status: 'success', data: [{ id: 'r1' }] });

    expect(page).toEqual({ items: [{ id: 'r1' }], total: 1, hasMore: false });
  });

  it('reads an envelope with no data as an empty one', () => {
    expect(transformApiPage({ status: 'success' })).toEqual({
      items: [],
      total: 0,
      hasMore: false,
    });
  });
});
