import { Prisma } from '../../../generated/prisma/client';

export interface WaypointPosition {
  id: string;
  order: number;
}

export interface WaypointValues extends WaypointPosition {
  latitude: number;
  longitude: number;
  /** null leaves the stored address alone; a string replaces it. */
  address: string | null;
}

export type RawExecutor = {
  $executeRaw(query: Prisma.Sql): Promise<number>;
};

export function applyWaypointOrder(
  tx: RawExecutor,
  roadId: string,
  positions: readonly WaypointPosition[],
): Promise<number> {
  if (positions.length === 0) return Promise.resolve(0);

  const values = Prisma.join(
    positions.map((p) => Prisma.sql`(${p.id}::text, ${p.order}::int)`),
  );

  return tx.$executeRaw(Prisma.sql`
    UPDATE "WayPoint" AS wp
       SET "order" = v.ord,
           "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(id, ord)
     WHERE wp.id = v.id
       AND wp."roadId" = ${roadId}
       AND wp."order" <> v.ord
  `);
}

export function applyWaypointValues(
  tx: RawExecutor,
  roadId: string,
  waypoints: readonly WaypointValues[],
): Promise<number> {
  if (waypoints.length === 0) return Promise.resolve(0);

  const values = Prisma.join(
    waypoints.map(
      (w) =>
        Prisma.sql`(${w.id}::text, ${w.latitude}::double precision, ${w.longitude}::double precision, ${w.order}::int, ${w.address}::text)`,
    ),
  );

  // COALESCE is what lets a caller reorder or nudge a stop without having to
  // resend its address: a null in that column means "leave what is there".
  return tx.$executeRaw(Prisma.sql`
    UPDATE "WayPoint" AS wp
       SET latitude = v.lat,
           longitude = v.lng,
           "order" = v.ord,
           address = COALESCE(v.address, wp.address),
           "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(id, lat, lng, ord, address)
     WHERE wp.id = v.id
       AND wp."roadId" = ${roadId}
  `);
}

export function compactWaypointOrder(
  tx: RawExecutor,
  roadId: string,
): Promise<number> {
  return tx.$executeRaw(Prisma.sql`
    WITH renumbered AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY "order" ASC, "createdAt" ASC, id ASC) AS new_order
        FROM "WayPoint"
       WHERE "roadId" = ${roadId}
    )
    UPDATE "WayPoint" AS wp
       SET "order" = renumbered.new_order,
           "updatedAt" = NOW()
      FROM renumbered
     WHERE wp.id = renumbered.id
       AND wp."order" <> renumbered.new_order
  `);
}

export function positionByRank<T extends { order?: number }>(
  waypoints: readonly T[],
): (T & { order: number })[] {
  return waypoints
    .map((waypoint, index) => ({ waypoint, index }))
    .sort(
      (a, b) =>
        (a.waypoint.order ?? a.index) - (b.waypoint.order ?? b.index) ||
        a.index - b.index,
    )
    .map(({ waypoint }, position) => ({ ...waypoint, order: position + 1 }));
}
