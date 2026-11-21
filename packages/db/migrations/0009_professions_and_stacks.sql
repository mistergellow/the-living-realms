CREATE TABLE "character_professions" (
	"character_id" uuid NOT NULL,
	"profession_id" text NOT NULL,
	"level" smallint DEFAULT 0 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"ready_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_professions_character_id_profession_id_pk" PRIMARY KEY("character_id","profession_id"),
	CONSTRAINT "character_professions_level_range" CHECK ("character_professions"."level" between 0 and 10)
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "character_professions" ADD CONSTRAINT "character_professions_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_quantity_positive" CHECK ("items"."quantity" > 0);