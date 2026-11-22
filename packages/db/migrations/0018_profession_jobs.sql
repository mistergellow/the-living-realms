CREATE TABLE "profession_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"profession_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"count" smallint NOT NULL,
	"node_q" integer,
	"node_r" integer,
	"node_richness" smallint,
	"tool_tier" smallint DEFAULT 0 NOT NULL,
	"attribute_bonus" smallint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"result" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finishes_at" timestamp with time zone NOT NULL,
	CONSTRAINT "profession_jobs_count_range" CHECK ("profession_jobs"."count" between 1 and 50)
);
--> statement-breakpoint
ALTER TABLE "profession_jobs" ADD CONSTRAINT "profession_jobs_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profession_jobs_character_uq" ON "profession_jobs" USING btree ("character_id");