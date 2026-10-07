-- Discover picks a few published routes at random. It used to sort every
-- published route by random() to do it, reading all of them on each request.
-- It now starts at a random id and reads forward through this index, so it
-- reads only about as many rows as it returns, however many routes there are.
CREATE INDEX IF NOT EXISTS "Road_isPublic_id_idx" ON "Road"("isPublic", "id");
