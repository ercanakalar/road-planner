-- ─────────────────────────────────────────────────────────────────────────────
-- Test data: 300 accounts, 5,000 routes, ~35,000 stops.
--
--   Sign in as   test@test.com / Test1234
--                test1@test.com … test299@test.com, same password
--
-- Run it against a database that has already been migrated
-- (`npx prisma migrate deploy`), from psql or pgAdmin's Query Tool:
--
--   psql "$DATABASE_URL" -f prisma/seeds/test-data.sql
--
-- pgAdmin's Restore dialog cannot read a plain .sql file — it wants a
-- pg_dump archive. Use the Query Tool (or psql) for this one.
--
-- ⚠  IT DELETES FIRST. The script begins by removing every account whose
-- address matches test<digits>@test.com, along with everything that cascades
-- from it — their routes, stops, favourites, follows and sessions. That is
-- what makes it safe to run twice. Nothing else is touched, but do not run it
-- against a database where somebody real owns one of those addresses.
--
-- The password is stored the way the API stores it: scrypt, N=32768 r=8 p=1,
-- 64-byte key, in the `scheme$params$salt$hash` shape
-- `src/auth/helper/helper.service.ts` writes and reads. Every account shares
-- one salt, which no real signup would do — it keeps this file small, and the
-- accounts are disposable.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── How much to make ────────────────────────────────────────────────────────
-- The only numbers worth editing. Everything below is derived from them, so
-- 50 users and 200 routes works exactly as well for a quick run.
CREATE TEMP TABLE seed_cfg ON COMMIT DROP AS
SELECT 300::int AS user_count,
       5000::int AS road_count;


-- ── Clear out a previous run ────────────────────────────────────────────────
DELETE FROM "User" WHERE "email"::text ~* '^test[0-9]*@test\.com$';


-- ── Permits ─────────────────────────────────────────────────────────────────
-- Registration refuses to run without the USER permit, so a database seeded by
-- this file alone is still one the app can sign people up against.
INSERT INTO "Permission" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.name, now(), now()
FROM (VALUES ('ACCESS_DASHBOARD'), ('MANAGE_USERS')) AS v(name)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Permit" ("id", "name", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.description, now(), now()
FROM (
  VALUES ('ADMIN', 'Full administrative access'),
         ('USER', 'Default permit granted on registration')
) AS v(name, description)
ON CONFLICT ("name") DO NOTHING;

-- "A" is Permission and "B" is Permit in Prisma's implicit join table.
INSERT INTO "_PermitPermissions" ("A", "B")
SELECT permission.id, permit.id
FROM "Permit" permit, "Permission" permission
WHERE permit."name" = 'ADMIN'
ON CONFLICT DO NOTHING;


-- ── Reference data ──────────────────────────────────────────────────────────
-- Routes are hung off real city centres so the map has something recognisable
-- to draw rather than a line through the Gulf of Guinea.
CREATE TEMP TABLE seed_city (idx int PRIMARY KEY, name text, lat float8, lon float8)
ON COMMIT DROP;

INSERT INTO seed_city VALUES
  ( 0, 'Istanbul',  41.0082, 28.9784),
  ( 1, 'Ankara',    39.9334, 32.8597),
  ( 2, 'Izmir',     38.4237, 27.1428),
  ( 3, 'Antalya',   36.8969, 30.7133),
  ( 4, 'Bursa',     40.1826, 29.0665),
  ( 5, 'Adana',     37.0000, 35.3213),
  ( 6, 'Konya',     37.8746, 32.4932),
  ( 7, 'Trabzon',   41.0027, 39.7168),
  ( 8, 'Gaziantep', 37.0662, 37.3833),
  ( 9, 'Eskisehir', 39.7767, 30.5206),
  (10, 'Mugla',     37.2153, 28.3636),
  (11, 'Kayseri',   38.7312, 35.4787);

CREATE TEMP TABLE seed_theme (idx int PRIMARY KEY, label text, blurb text)
ON COMMIT DROP;

INSERT INTO seed_theme VALUES
  (0, 'Coastal drive',   'Water on one side the whole way, and somewhere to stop for lunch halfway along.'),
  (1, 'Old town walk',   'Short, flat, and almost entirely cobbles. Comfortable shoes.'),
  (2, 'Mountain loop',   'Climbs steadily for the first half and gives it all back on the way down.'),
  (3, 'Sunday morning',  'Quiet enough before nine to be worth the early start.'),
  (4, 'Market run',      'Three markets and a bakery, in the order they open.'),
  (5, 'Sunset route',    'Timed so the last stop faces west. Leave two hours before dusk.'),
  (6, 'Weekend escape',  'Far enough out to feel like somewhere else, close enough to be back by dark.'),
  (7, 'Riverside trail', 'Follows the water out of town and picks up the far bank coming back.'),
  (8, 'Night ride',      'Lit the whole way, and the traffic thins out after ten.'),
  (9, 'Long way round',  'There is a faster road. This is not it, and that is the point.');


-- ── Accounts ────────────────────────────────────────────────────────────────
-- Ids are minted first so routes, favourites and follows can be joined to them
-- by index rather than looked up by address one at a time.
CREATE TEMP TABLE seed_user (idx int PRIMARY KEY, id text NOT NULL) ON COMMIT DROP;

INSERT INTO seed_user (idx, id)
SELECT i, gen_random_uuid()::text
FROM generate_series(0, (SELECT user_count - 1 FROM seed_cfg)) AS g(i);

-- test@test.com, then test1@test.com upwards. The first account has no number
-- so the address people are given to try is the plain one.
CREATE TEMP TABLE seed_handle (idx int PRIMARY KEY, handle text) ON COMMIT DROP;

INSERT INTO seed_handle (idx, handle)
SELECT idx, 'test' || CASE WHEN idx = 0 THEN '' ELSE idx::text END
FROM seed_user;

INSERT INTO "User" (
  "id", "email", "firstName", "lastName", "nickName", "photo",
  "permitId", "createdAt", "updatedAt"
)
SELECT
  u.id,
  (h.handle || '@test.com')::citext,
  (ARRAY['Ada','Bora','Ceren','Demir','Ela','Firat','Gizem','Hakan','Irem',
         'Jale','Kaan','Lale','Mert','Nehir','Onur','Pelin','Rana','Selim',
         'Tuna','Umut'])[(u.idx % 20) + 1],
  (ARRAY['Akalar','Baysal','Cetin','Demirci','Erdogan','Findik','Gunes',
         'Hazar','Ilgaz','Kaya','Limon','Mutlu','Narin','Ozturk','Polat',
         'Sahin','Tekin','Ulus','Varol','Yildiz'])[(u.idx % 20) + 1],
  h.handle,
  NULL,
  (SELECT id FROM "Permit" WHERE "name" = 'USER'),
  now() - make_interval(days => 730 - (u.idx % 700)),
  now()
FROM seed_user u
JOIN seed_handle h ON h.idx = u.idx;

-- One credential row each, all holding the same scrypt hash of "Test1234".
INSERT INTO "ManuelAuth" ("id", "email", "password", "userId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  usr."email",
  'scrypt$N=32768,r=8,p=1$845cf004a4d17195f6b50556e91c5821$c48902a930249745e91ed8bf31e3eedbda6e97e822f2bf7e845221eb5b29459ea62171fa875ddb6f19e200facdd61489b48b88323a5e8b85dfa646753b4c5f48',
  usr."id",
  usr."createdAt",
  now()
FROM "User" usr
JOIN seed_user u ON u.id = usr.id;


-- ── Routes ──────────────────────────────────────────────────────────────────
-- Everything about a route is derived from its index rather than drawn at
-- random, so two runs of this file produce the same shape of data and a bug
-- that only shows up on a 12-stop private route stays reproducible.
CREATE TEMP TABLE seed_road (
  idx        int PRIMARY KEY,
  id         text NOT NULL,
  user_idx   int NOT NULL,
  slot       int NOT NULL,
  city_idx   int NOT NULL,
  theme_idx  int NOT NULL,
  stop_count int NOT NULL,
  is_public  boolean NOT NULL,
  archived   boolean NOT NULL,
  created_at timestamp NOT NULL
) ON COMMIT DROP;

-- Routes are dealt round-robin, so `user_idx` is `i` modulo the number of
-- accounts and `slot` is which of that person's routes this is. Everything
-- else mixes both in, which is not decoration: a property derived from `i`
-- alone modulo anything that divides the account count is constant per
-- account. Publishing on `i % 10` looked like nine routes in ten, and was
-- really every route of nine accounts in ten — leaving test@test.com, the
-- first account anyone signs in as, with nothing published at all.
INSERT INTO seed_road
SELECT
  i,
  gen_random_uuid()::text,
  i % cfg.user_count,
  i / cfg.user_count,
  ((i * 7) + (i / cfg.user_count) * 5) % 12,
  ((i * 3) + (i / cfg.user_count) * 7) % 10,
  -- 2 to 12 stops, so all three length filters (2–4, 5–9, 10+) have members.
  2 + (i % 11),
  -- One route in ten is private, a different one for each account, so every
  -- account has both kinds and the rule that a private route is invisible to
  -- everyone but its owner has something to hide.
  (((i % cfg.user_count) + (i / cfg.user_count)) % 10) <> 0,
  -- A handful are archived, which should hide them from search and discover
  -- without deleting anyone's saved copy.
  (i % 137) = 0,
  now() - make_interval(mins => i * 97)
FROM seed_cfg cfg,
     generate_series(0, (SELECT road_count - 1 FROM seed_cfg)) AS g(i);

INSERT INTO "Road" (
  "id", "userId", "title", "description", "isPublic", "archivedAt",
  "createdAt", "updatedAt"
)
SELECT
  r.id,
  u.id,
  t.label || ' around ' || c.name || ' #' || (r.slot + 1),
  t.blurb || ' ' || r.stop_count || ' stops, starting in ' || c.name || '.',
  r.is_public,
  CASE WHEN r.archived THEN r.created_at + interval '40 days' ELSE NULL END,
  r.created_at,
  r.created_at
FROM seed_road r
JOIN seed_user u ON u.idx = r.user_idx
JOIN seed_city c ON c.idx = r.city_idx
JOIN seed_theme t ON t.idx = r.theme_idx;


-- ── Stops ───────────────────────────────────────────────────────────────────
-- `order` is a dense 1-based rank per route, which is what every writer in the
-- API produces and what the stop-count filters in search read: a route has at
-- least N stops exactly when one of them is ranked N or higher.
INSERT INTO "Stop" (
  "id", "latitude", "longitude", "order", "roadId", "address", "elevation",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  c.lat + ((r.idx % 17) - 8) * 0.01 + (s.n - 1) * 0.012,
  c.lon + ((r.idx % 23) - 11) * 0.01 + (s.n - 1) * 0.015,
  s.n,
  r.id,
  (10 + (r.idx * 7 + s.n * 13) % 180) || ' '
    || (ARRAY['Bahce','Cinar','Deniz','Fidan','Gul','Liman','Menekse',
              'Palmiye','Sahil','Zeytin'])[((r.idx + s.n) % 10) + 1]
    || ' Sokak, '
    || (ARRAY['Merkez','Yenimahalle','Bahcelievler','Cumhuriyet','Kordon',
              'Tepebasi'])[((r.idx * 3 + s.n) % 6) + 1]
    || ', ' || c.name,
  120 + ((r.idx * 13 + s.n * 29) % 900),
  r.created_at,
  r.created_at
FROM seed_road r
JOIN seed_city c ON c.idx = r.city_idx
CROSS JOIN LATERAL generate_series(1, r.stop_count) AS s(n);


-- ── Favourites ──────────────────────────────────────────────────────────────
-- Uneven on purpose: without a spread there is nothing for search's "Most
-- saved" ordering to sort by. Nought to eight savers per published route, and
-- never the person who made it.
INSERT INTO "FavoriteRoad" (
  "id", "userId", "roadId", "title", "description", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  fan.id,
  r.id,
  NULL,
  NULL,
  r.created_at + make_interval(days => k.n),
  now()
FROM seed_road r
CROSS JOIN LATERAL generate_series(1, (r.idx * 5) % 9) AS k(n)
JOIN seed_user fan
  ON fan.idx = (r.user_idx + k.n * 3) % (SELECT user_count FROM seed_cfg)
WHERE r.is_public AND NOT r.archived;

-- A saved place, rather than a saved route: the favourites screen lists both.
INSERT INTO "FavoriteStop" (
  "id", "userId", "stopId", "title", "description", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  fan.id,
  st."id",
  'Meet here',
  NULL,
  r.created_at + interval '2 days',
  now()
FROM seed_road r
JOIN "Stop" st ON st."roadId" = r.id AND st."order" = 1
JOIN seed_user fan
  ON fan.idx = (r.user_idx + 11) % (SELECT user_count FROM seed_cfg)
WHERE r.is_public AND NOT r.archived AND (r.idx % 6) = 0;


-- ── Follows ─────────────────────────────────────────────────────────────────
-- Three authors each, so the "notify me when they publish" button has both
-- states to show and the publish notifier has somebody to write to.
INSERT INTO "AuthorFollow" ("id", "followerId", "authorId", "createdAt")
SELECT
  gen_random_uuid()::text,
  follower.id,
  author.id,
  now() - make_interval(days => k.n)
FROM seed_user follower
CROSS JOIN generate_series(1, 3) AS k(n)
JOIN seed_user author
  ON author.idx = (follower.idx + k.n * 7) % (SELECT user_count FROM seed_cfg);

COMMIT;


-- ── What was made ───────────────────────────────────────────────────────────
SELECT 'users'            AS table, count(*) FROM "User"         WHERE "email"::text ~* '^test[0-9]*@test\.com$'
UNION ALL SELECT 'routes',          count(*) FROM "Road"
UNION ALL SELECT 'routes public',   count(*) FROM "Road" WHERE "isPublic" AND "archivedAt" IS NULL
UNION ALL SELECT 'stops',           count(*) FROM "Stop"
UNION ALL SELECT 'saved routes',    count(*) FROM "FavoriteRoad"
UNION ALL SELECT 'saved stops',     count(*) FROM "FavoriteStop"
UNION ALL SELECT 'follows',         count(*) FROM "AuthorFollow";
