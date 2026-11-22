ALTER TABLE "character_professions" DROP CONSTRAINT "character_professions_level_range";--> statement-breakpoint
ALTER TABLE "character_professions" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "character_professions" ADD COLUMN "successes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "character_professions" ADD COLUMN "items_made" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Request #51: old profession ids -> the 15 professions (same mapping as
-- RENAMED_PROFESSIONS in game-core). When a character has both, the better row wins.
DO $$
DECLARE m text[];
BEGIN
  FOREACH m SLICE 1 IN ARRAY ARRAY[
    ['blacksmithing', 'blacksmith'], ['runesmithing', 'runecrafter'],
    ['farming', 'herbalism'], ['medicine', 'tailoring']
  ] LOOP
    DELETE FROM "character_professions" o USING "character_professions" n
      WHERE o."profession_id" = m[1] AND n."profession_id" = m[2]
        AND n."character_id" = o."character_id" AND (n."level", n."xp") >= (o."level", o."xp");
    DELETE FROM "character_professions" n USING "character_professions" o
      WHERE n."profession_id" = m[2] AND o."profession_id" = m[1]
        AND n."character_id" = o."character_id";
    UPDATE "character_professions" SET "profession_id" = m[2] WHERE "profession_id" = m[1];
  END LOOP;
END $$;--> statement-breakpoint
-- Levels 0-10 -> Mastery ranks: 0-2 Novice, 3-5 Apprentice, 6-8 Journeyman, 9-10 Expert.
UPDATE "character_professions" SET "level" = LEAST(3, "level" / 3), "xp" = 0;--> statement-breakpoint
ALTER TABLE "character_professions" ADD CONSTRAINT "character_professions_rank_range" CHECK ("character_professions"."level" between 0 and 5);--> statement-breakpoint
-- Request #51: every living character gets the four basic tools (in the bag
-- when it has room, otherwise in the city storage).
INSERT INTO "items" ("id", "character_id", "item_def_id", "source", "in_storage")
SELECT gen_random_uuid(), c."id", t.def, 'starter',
  (SELECT count(*) FROM "items" i
     WHERE i."character_id" = c."id" AND i."equipped_slot" IS NULL AND NOT i."in_storage") > 16
FROM "characters" c
CROSS JOIN (VALUES ('fishing_rod'), ('felling_axe'), ('pickaxe'), ('hunting_knife')) AS t(def)
WHERE c."deleted_at" IS NULL;
