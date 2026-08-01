import { Prisma } from '@prisma/client';

export interface WaypointPosition {
  id: string;
  order: number;
}

export interface AddressValues {
  id: string;
  country: string | null;
  province: string | null;
  district: string | null;
  address: string;
}

export interface WaypointValues extends WaypointPosition {
  latitude: number;
  longitude: number;
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
        Prisma.sql`(${w.id}::text, ${w.latitude}::double precision, ${w.longitude}::double precision, ${w.order}::int)`,
    ),
  );

  return tx.$executeRaw(Prisma.sql`
    UPDATE "WayPoint" AS wp
       SET latitude = v.lat,
           longitude = v.lng,
           "order" = v.ord,
           "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(id, lat, lng, ord)
     WHERE wp.id = v.id
       AND wp."roadId" = ${roadId}
  `);
}

export function applyAddressValues(
  tx: RawExecutor,
  addresses: readonly AddressValues[],
): Promise<number> {
  if (addresses.length === 0) return Promise.resolve(0);

  const values = Prisma.join(
    addresses.map(
      (a) =>
        Prisma.sql`(${a.id}::text, ${a.country}::text, ${a.province}::text, ${a.district}::text, ${a.address}::text)`,
    ),
  );

  return tx.$executeRaw(Prisma.sql`
    UPDATE "AddressInfo" AS ai
       SET country = v.country,
           province = v.province,
           district = v.district,
           address = v.address,
           "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(id, country, province, district, address)
     WHERE ai.id = v.id
  `);
}

export function linkWaypointAddresses(
  tx: RawExecutor,
  roadId: string,
  links: readonly { waypointId: string; addressInfoId: string }[],
): Promise<number> {
  if (links.length === 0) return Promise.resolve(0);

  const values = Prisma.join(
    links.map(
      (l) => Prisma.sql`(${l.waypointId}::text, ${l.addressInfoId}::text)`,
    ),
  );

  return tx.$executeRaw(Prisma.sql`
    UPDATE "WayPoint" AS wp
       SET "addressInfoId" = v.address_id,
           "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(id, address_id)
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
