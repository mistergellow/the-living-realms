ALTER TABLE "items" ADD COLUMN "upgrade_level" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "specials" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "rune_slots" jsonb DEFAULT '[{"unlocked":false,"runeId":null},{"unlocked":false,"runeId":null}]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_upgrade_level_range" CHECK ("items"."upgrade_level" between 0 and 10);--> statement-breakpoint
-- Request #31: attributes renamed to match the combat spec (Vitality → Endurance, Arcana → Intellect, Spirit → Will).
ALTER TABLE "characters" RENAME COLUMN "attr_vitality" TO "attr_endurance";--> statement-breakpoint
ALTER TABLE "characters" RENAME COLUMN "attr_arcana" TO "attr_intellect";--> statement-breakpoint
ALTER TABLE "characters" RENAME COLUMN "attr_spirit" TO "attr_will";--> statement-breakpoint
-- Request #31: Rift runs now store an exploration state (map + rooms). Runs still active in the old
-- format (a fixed list of combat rooms) are closed without penalty.
UPDATE "rift_runs" SET "status" = 'abandoned', "ended_at" = now(), "turn_deadline" = NULL
  WHERE "status" = 'active' AND NOT ("state" ? 'version');
