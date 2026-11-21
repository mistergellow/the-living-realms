ALTER TABLE "character_skills" ADD COLUMN "rank" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "character_skills" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "character_skills" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "origin" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "read_ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_rank_range" CHECK ("character_skills"."rank" between 1 and 20);