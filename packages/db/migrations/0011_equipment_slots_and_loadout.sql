ALTER TABLE "character_skills" ADD COLUMN "loadout_slot" smallint;--> statement-breakpoint
CREATE UNIQUE INDEX "character_skills_loadout_uq" ON "character_skills" USING btree ("character_id","loadout_slot") WHERE "character_skills"."loadout_slot" is not null;--> statement-breakpoint
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_loadout_range" CHECK ("character_skills"."loadout_slot" between 0 and 7);--> statement-breakpoint
-- Request #39: skills already learned stay usable — the first 8 are prepared.
UPDATE "character_skills" cs SET "loadout_slot" = r.n - 1
  FROM (SELECT "character_id", "skill_id",
               row_number() OVER (PARTITION BY "character_id" ORDER BY "learned_at", "skill_id") AS n
          FROM "character_skills") r
  WHERE cs."character_id" = r."character_id" AND cs."skill_id" = r."skill_id" AND r.n <= 8;--> statement-breakpoint
-- New equipment slots: legs → feet (Leather Leggings become Leather Boots),
-- accessories → rings, Charm of Focus → pendant.
UPDATE "items" SET "item_def_id" = 'leather_boots' WHERE "item_def_id" = 'leather_leggings';--> statement-breakpoint
UPDATE "items" SET "equipped_slot" = 'feet' WHERE "equipped_slot" = 'legs';--> statement-breakpoint
UPDATE "items" SET "equipped_slot" = NULL
  WHERE "item_def_id" = 'charm_of_focus' AND "equipped_slot" IS NOT NULL;--> statement-breakpoint
UPDATE "items" SET "equipped_slot" = 'ring1' WHERE "equipped_slot" = 'accessory1';--> statement-breakpoint
UPDATE "items" SET "equipped_slot" = 'ring2' WHERE "equipped_slot" = 'accessory2';
