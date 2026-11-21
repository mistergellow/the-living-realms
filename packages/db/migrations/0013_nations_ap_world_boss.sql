CREATE TABLE "world_boss_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"boss_id" uuid NOT NULL,
	"run_id" uuid,
	"party_key" text NOT NULL,
	"members" jsonb NOT NULL,
	"damage" bigint DEFAULT 0 NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_bosses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"season" integer NOT NULL,
	"hp" bigint NOT NULL,
	"max_hp" bigint NOT NULL,
	"hex_q" integer NOT NULL,
	"hex_r" integer NOT NULL,
	"next_move_at" timestamp with time zone NOT NULL,
	"defeated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "nation" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "ap" double precision DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "ap_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "world_boss_attempts" ADD CONSTRAINT "world_boss_attempts_boss_id_world_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."world_bosses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_boss_attempts" ADD CONSTRAINT "world_boss_attempts_run_id_rift_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."rift_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_bosses" ADD CONSTRAINT "world_bosses_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "world_boss_attempts_boss_idx" ON "world_boss_attempts" USING btree ("boss_id","party_key");--> statement-breakpoint
CREATE INDEX "world_boss_attempts_run_idx" ON "world_boss_attempts" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "world_bosses_world_season_uq" ON "world_bosses" USING btree ("world_id","season");--> statement-breakpoint
-- Request #43: older characters had no nation and stood at (0, 0), now the
-- heart of the Riftlands. They become citizens of the West and move to its
-- capital (provisional, A84).
UPDATE "characters" SET "nation" = 'west', "hex_q" = -14, "hex_r" = 2 WHERE "nation" IS NULL;
