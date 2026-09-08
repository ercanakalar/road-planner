import { Prisma } from '../../../generated/prisma/client';

import {
  applyStopOrder,
  applyStopValues,
  compactStopOrder,
  positionByRank,
  RawExecutor,
} from './stop-writes';

const ROAD_ID = 'road-1';

const createExecutor = () => {
  const statements: Prisma.Sql[] = [];

  const tx: RawExecutor = {
    $executeRaw: (query: Prisma.Sql) => {
      statements.push(query);
      return Promise.resolve(statements.length);
    },
  };

  return { tx, statements };
};

const textOf = (sql: Prisma.Sql) => sql.strings.join('?');

describe('applyStopOrder', () => {
  it('issues one statement for any number of stops', async () => {
    const { tx, statements } = createExecutor();

    await applyStopOrder(tx, ROAD_ID, [
      { id: 'wp-1', order: 3 },
      { id: 'wp-2', order: 1 },
      { id: 'wp-3', order: 2 },
    ]);

    expect(statements).toHaveLength(1);
  });

  it('parameterises every id and position', async () => {
    const { tx, statements } = createExecutor();

    await applyStopOrder(tx, ROAD_ID, [
      { id: 'wp-1', order: 3 },
      { id: 'wp-2', order: 1 },
    ]);

    expect(statements[0].values).toEqual(['wp-1', 3, 'wp-2', 1, ROAD_ID]);
  });

  it('does not splice values into the statement text', async () => {
    const { tx, statements } = createExecutor();

    await applyStopOrder(tx, ROAD_ID, [
      { id: '\'; DROP TABLE "Stop"; --', order: 1 },
    ]);

    expect(textOf(statements[0])).not.toMatch(/DROP TABLE/);
    expect(statements[0].values).toContain('\'; DROP TABLE "Stop"; --');
  });

  it('scopes the update to the road as well as the ids', async () => {
    const { tx, statements } = createExecutor();

    await applyStopOrder(tx, ROAD_ID, [{ id: 'wp-1', order: 1 }]);

    expect(textOf(statements[0])).toMatch(/wp\."roadId" = \?/);
  });

  it('skips positions that are already correct', async () => {
    const { tx, statements } = createExecutor();

    await applyStopOrder(tx, ROAD_ID, [{ id: 'wp-1', order: 1 }]);

    expect(textOf(statements[0])).toMatch(/"order" <> v\.ord/);
  });

  it('issues nothing for an empty list', async () => {
    const { tx, statements } = createExecutor();

    await expect(applyStopOrder(tx, ROAD_ID, [])).resolves.toBe(0);
    expect(statements).toHaveLength(0);
  });
});

describe('applyStopValues', () => {
  it('carries coordinates and position for each stop', async () => {
    const { tx, statements } = createExecutor();

    await applyStopValues(tx, ROAD_ID, [
      {
        id: 'wp-1',
        latitude: 1.5,
        longitude: 2.5,
        order: 1,
        address: 'A St',
        refreshElevation: true,
        elevation: 120.5,
      },
      {
        id: 'wp-2',
        latitude: 3.5,
        longitude: 4.5,
        order: 2,
        address: 'B St',
        refreshElevation: false,
        elevation: null,
      },
    ]);

    expect(statements).toHaveLength(1);
    expect(statements[0].values).toEqual([
      'wp-1',
      1.5,
      2.5,
      1,
      'A St',
      true,
      120.5,
      'wp-2',
      3.5,
      4.5,
      2,
      'B St',
      false,
      null,
      ROAD_ID,
    ]);
  });

  it('passes a null address through, for COALESCE to leave alone', async () => {
    const { tx, statements } = createExecutor();

    await applyStopValues(tx, ROAD_ID, [
      {
        id: 'wp-1',
        latitude: 1,
        longitude: 2,
        order: 1,
        address: null,
        refreshElevation: false,
        elevation: null,
      },
    ]);

    // Coercing this to '' would blank the stop's name on every reorder.
    expect(statements[0].values).toEqual([
      'wp-1',
      1,
      2,
      1,
      null,
      false,
      null,
      ROAD_ID,
    ]);
  });

  it('leaves a stored elevation alone unless the row asks for it', async () => {
    const { tx, statements } = createExecutor();

    await applyStopValues(tx, ROAD_ID, [
      {
        id: 'wp-1',
        latitude: 1,
        longitude: 2,
        order: 1,
        address: null,
        refreshElevation: false,
        elevation: null,
      },
    ]);

    // A stop that did not move keeps the height it already had, rather than
    // losing it to a lookup that was never made.
    expect(textOf(statements[0])).toMatch(
      /elevation = CASE WHEN v\.refresh THEN v\.elevation ELSE wp\.elevation END/,
    );
  });

  it('clears the elevation of a stop that moved somewhere unreadable', async () => {
    const { tx, statements } = createExecutor();

    await applyStopValues(tx, ROAD_ID, [
      {
        id: 'wp-1',
        latitude: 1,
        longitude: 2,
        order: 1,
        address: null,
        refreshElevation: true,
        elevation: null,
      },
    ]);

    // refreshElevation says the lookup ran; null says it came back empty. The
    // pin is somewhere new, so the old height is not an answer for it.
    expect(statements[0].values).toEqual([
      'wp-1',
      1,
      2,
      1,
      null,
      true,
      null,
      ROAD_ID,
    ]);
  });

  it('issues nothing for an empty list', async () => {
    const { tx, statements } = createExecutor();

    await applyStopValues(tx, ROAD_ID, []);

    expect(statements).toHaveLength(0);
  });
});

describe('compactStopOrder', () => {
  it('renumbers without reading the ids back first', async () => {
    const { tx, statements } = createExecutor();

    await compactStopOrder(tx, ROAD_ID);

    expect(statements).toHaveLength(1);
    expect(statements[0].values).toEqual([ROAD_ID]);
    expect(textOf(statements[0])).toMatch(/ROW_NUMBER\(\)/);
  });

  it('breaks ties deterministically', async () => {
    const { tx, statements } = createExecutor();

    await compactStopOrder(tx, ROAD_ID);

    expect(textOf(statements[0])).toMatch(
      /ORDER BY "order" ASC, "createdAt" ASC, id ASC/,
    );
  });
});

describe('positionByRank', () => {
  it('assigns contiguous 1-based positions', () => {
    const result = positionByRank([
      { order: 10, tag: 'a' },
      { order: 20, tag: 'b' },
      { order: 30, tag: 'c' },
    ]);

    expect(result.map((w) => [w.tag, w.order])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('sorts by the supplied ranking', () => {
    const result = positionByRank([
      { order: 3, tag: 'c' },
      { order: 1, tag: 'a' },
      { order: 2, tag: 'b' },
    ]);

    expect(result.map((w) => w.tag)).toEqual(['a', 'b', 'c']);
  });

  it('resolves duplicate rankings without losing an entry', () => {
    const result = positionByRank([
      { order: 1, tag: 'a' },
      { order: 1, tag: 'b' },
      { order: 1, tag: 'c' },
    ]);

    expect(result.map((w) => [w.tag, w.order])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('closes gaps in the ranking', () => {
    const result = positionByRank([
      { order: 5, tag: 'a' },
      { order: 99, tag: 'b' },
    ]);

    expect(result.map((w) => w.order)).toEqual([1, 2]);
  });

  it('falls back to arrival order when no ranking is supplied', () => {
    const result = positionByRank<{ order?: number; tag: string }>([
      { tag: 'a' },
      { tag: 'b' },
      { tag: 'c' },
    ]);

    expect(result.map((w) => [w.tag, w.order])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('is stable for equal rankings', () => {
    const result = positionByRank([
      { order: 1, tag: 'first' },
      { order: 1, tag: 'second' },
    ]);

    expect(result.map((w) => w.tag)).toEqual(['first', 'second']);
  });

  it('does not mutate its input', () => {
    const input = [
      { order: 2, tag: 'b' },
      { order: 1, tag: 'a' },
    ];

    positionByRank(input);

    expect(input.map((w) => w.tag)).toEqual(['b', 'a']);
  });

  it('returns an empty list unchanged', () => {
    expect(positionByRank([])).toEqual([]);
  });
});
