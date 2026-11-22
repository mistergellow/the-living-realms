ALTER TABLE "characters" ADD COLUMN "storage_slots" smallint DEFAULT 80 NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "slot" smallint;