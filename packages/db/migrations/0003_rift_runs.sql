CREATE TABLE "rift_run_participants" (
	"run_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"result" jsonb,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rift_run_participants_run_id_character_id_pk" PRIMARY KEY("run_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "rift_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"rift_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"room_index" smallint DEFAULT 0 NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"turn_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rift_run_participants" ADD CONSTRAINT "rift_run_participants_run_id_rift_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."rift_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_run_participants" ADD CONSTRAINT "rift_run_participants_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_run_participants" ADD CONSTRAINT "rift_run_participants_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_runs" ADD CONSTRAINT "rift_runs_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rift_run_participants_character_idx" ON "rift_run_participants" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "rift_runs_status_idx" ON "rift_runs" USING btree ("status");