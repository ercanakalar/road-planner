import { Prisma } from '../../../generated/prisma/client';

export interface StopPosition {
  id: string;
  order: number;
}

export interface StopValues extends StopPosition {
  latitude: number;
  longitude: number;
  /** null leaves the stored address alone; a string replaces it. */
  address: string | null;
  /**
   * Whether the stored elevation is being replaced by `elevation`. False leaves
   * it as it is. The two are separate because null is a real answer here — a
   * stop that moved somewhere the Elevation API could not read has no height,
   * and keeping the old one would put a slope on the map that nothing measured.
   */
  refreshElevation: boolean;
  elevation: number | null;
}

export type RawExecutor = {
  $executeRaw(query: Prisma.Sql): Promise<number>;
};

export function applyStopOrder(
  tx: RawExecutor,
  roadId: string,
  positions: readonly StopPosition[],
): Promise<number> {
  if (positions.length === 0) return Promise.resolve(0);

  const values = Prisma.join(
    positions.map((p) => Prisma.sql`(${p.id}::text, ${p.order}::int)`),
  );

  return tx.$executeRaw(Prisma.sql`
    UPDATE "Stop" AS wp
       SET "order" = v.ord,
           "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(id, ord)
     WHERE wp.id = v.id
       AND wp."roadId" = ${roadId}
       AND wp."order" <> v.ord
  `);
}

export function applyStopValues(
  tx: RawExecutor,
  roadId: string,
  stops: readonly StopValues[],
): Promise<number> {
  if (stops.length === 0) return Promise.resolve(0);

  const values = Prisma.join(
    stops.map(
      (w) =>
        Prisma.sql`(${w.id}::text, ${w.latitude}::double precision, ${w.longitude}::double precision, ${w.order}::int, ${w.address}::text, ${w.refreshElevation}::boolean, ${w.elevation}::double precision)`,
    ),
  );

  // COALESCE is what lets a caller reorder or nudge a stop without having to
  // resend its address: a null in that column means "leave what is there".
  // Elevation cannot say the same thing that way, because null is one of its
  // answers, so it carries its own flag.
  return tx.$executeRaw(Prisma.sql`
    UPDATE "Stop" AS wp
       SET latitude = v.lat,
           longitude = v.lng,
           "order" = v.ord,
           address = COALESCE(v.address, wp.address),
           elevation = CASE WHEN v.refresh THEN v.elevation ELSE wp.elevation END,
           "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(id, lat, lng, ord, address, refresh, elevation)
     WHERE wp.id = v.id
       AND wp."roadId" = ${roadId}
  `);
}

export function compactStopOrder(
  tx: RawExecutor,
  roadId: string,
): Promise<number> {
  return tx.$executeRaw(Prisma.sql`
    WITH renumbered AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY "order" ASC, "createdAt" ASC, id ASC) AS new_order
        FROM "Stop"
       WHERE "roadId" = ${roadId}
    )
    UPDATE "Stop" AS wp
       SET "order" = renumbered.new_order,
           "updatedAt" = NOW()
      FROM renumbered
     WHERE wp.id = renumbered.id
       AND wp."order" <> renumbered.new_order
  `);
}

export function positionByRank<T extends { order?: number }>(
  stops: readonly T[],
): (T & { order: number })[] {
  return stops
    .map((stop, index) => ({ stop, index }))
    .sort(
      (a, b) =>
        (a.stop.order ?? a.index) - (b.stop.order ?? b.index) ||
        a.index - b.index,
    )
    .map(({ stop }, position) => ({ ...stop, order: position + 1 }));
}
