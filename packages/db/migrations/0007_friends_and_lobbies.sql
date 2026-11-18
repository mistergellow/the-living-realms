CREATE TABLE "friendships" (
	"character_a" uuid NOT NULL,
	"character_b" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "friendships_character_a_character_b_pk" PRIMARY KEY("character_a","character_b"),
	CONSTRAINT "friendships_ordered" CHECK ("friendships"."character_a" < "friendships"."character_b")
);
--> statement-breakpoint
CREATE TABLE "rift_lobbies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"rift_id" text NOT NULL,
	"leader_character_id" uuid NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rift_lobby_invites" (
	"lobby_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rift_lobby_invites_lobby_id_character_id_pk" PRIMARY KEY("lobby_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "rift_lobby_members" (
	"lobby_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"slot" smallint NOT NULL,
	"ready" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rift_lobby_members_lobby_id_character_id_pk" PRIMARY KEY("lobby_id","character_id")
);
--> statement-breakpoint
ALTER TABLE "rift_run_participants" ADD COLUMN "left_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_character_a_characters_id_fk" FOREIGN KEY ("character_a") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_character_b_characters_id_fk" FOREIGN KEY ("character_b") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requested_by_characters_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobbies" ADD CONSTRAINT "rift_lobbies_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobbies" ADD CONSTRAINT "rift_lobbies_leader_character_id_characters_id_fk" FOREIGN KEY ("leader_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobbies" ADD CONSTRAINT "rift_lobbies_run_id_rift_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."rift_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobby_invites" ADD CONSTRAINT "rift_lobby_invites_lobby_id_rift_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."rift_lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobby_invites" ADD CONSTRAINT "rift_lobby_invites_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobby_invites" ADD CONSTRAINT "rift_lobby_invites_invited_by_characters_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobby_members" ADD CONSTRAINT "rift_lobby_members_lobby_id_rift_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."rift_lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobby_members" ADD CONSTRAINT "rift_lobby_members_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rift_lobby_members" ADD CONSTRAINT "rift_lobby_members_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friendships_b_idx" ON "friendships" USING btree ("character_b");--> statement-breakpoint
CREATE INDEX "rift_lobbies_status_idx" ON "rift_lobbies" USING btree ("status","visibility");--> statement-breakpoint
CREATE INDEX "rift_lobby_invites_character_idx" ON "rift_lobby_invites" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rift_lobby_members_slot_uq" ON "rift_lobby_members" USING btree ("lobby_id","slot");--> statement-breakpoint
CREATE INDEX "rift_lobby_members_character_idx" ON "rift_lobby_members" USING btree ("character_id");