CREATE TABLE "character_skills" (
	"character_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"learned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_skills_character_id_skill_id_pk" PRIMARY KEY("character_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"item_def_id" text NOT NULL,
	"quality" smallint DEFAULT 100 NOT NULL,
	"equipped_slot" text,
	"source" text DEFAULT 'starter' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_quality_range" CHECK ("items"."quality" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "attr_str" smallint DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "attr_dex" smallint DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "attr_con" smallint DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "attr_int" smallint DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "attr_wis" smallint DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "attr_cha" smallint DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "reputation" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_character_idx" ON "items" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "items_character_slot_uq" ON "items" USING btree ("character_id","equipped_slot") WHERE "items"."equipped_slot" is not null;