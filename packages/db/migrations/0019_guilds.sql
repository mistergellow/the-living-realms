CREATE TABLE "guild_invites" (
	"guild_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guild_invites_guild_id_character_id_pk" PRIMARY KEY("guild_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "guild_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guild_id" uuid NOT NULL,
	"item_def_id" text NOT NULL,
	"quality" smallint DEFAULT 100 NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"upgrade_level" smallint DEFAULT 0 NOT NULL,
	"grade" smallint,
	"specials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rune_slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text DEFAULT 'guild' NOT NULL,
	"deposited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_members" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"guild_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"leader_character_id" uuid,
	"reputation" bigint DEFAULT 0 NOT NULL,
	"gold" bigint DEFAULT 0 NOT NULL,
	"land_q" integer,
	"land_r" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guilds_gold_nonneg" CHECK ("guilds"."gold" >= 0)
);
--> statement-breakpoint
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_invited_by_characters_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_items" ADD CONSTRAINT "guild_items_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_items" ADD CONSTRAINT "guild_items_deposited_by_characters_id_fk" FOREIGN KEY ("deposited_by") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_leader_character_id_characters_id_fk" FOREIGN KEY ("leader_character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guild_items_guild_idx" ON "guild_items" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "guild_members_guild_idx" ON "guild_members" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guilds_world_name_uq" ON "guilds" USING btree ("world_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "guilds_world_land_uq" ON "guilds" USING btree ("world_id","land_q","land_r") WHERE "guilds"."land_q" is not null;