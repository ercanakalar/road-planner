-- Which language to write to a person in.
--
-- Nullable rather than defaulted: a row that has never been seen is different
-- from one that asked for English, and only the first should follow whatever
-- the fallback becomes.
ALTER TABLE "User" ADD COLUMN "language" VARCHAR(8);
