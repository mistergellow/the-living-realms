ALTER TABLE "characters" ADD COLUMN "gold" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "in_storage" boolean DEFAULT false NOT NULL;