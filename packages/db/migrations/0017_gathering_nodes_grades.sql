CREATE TABLE "resource_nodes" (
	"world_id" uuid NOT NULL,
	"hex_q" integer NOT NULL,
	"hex_r" integer NOT NULL,
	"profession_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_nodes_world_id_hex_q_hex_r_profession_id_pk" PRIMARY KEY("world_id","hex_q","hex_r","profession_id")
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "grade" smallint;--> statement-breakpoint
ALTER TABLE "resource_nodes" ADD CONSTRAINT "resource_nodes_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_grade_range" CHECK ("items"."grade" between 0 and 4);--> statement-breakpoint
-- Request #52: gathered materials already owned count as Common (grade 1), so
-- they stack with the Common ones gathered from now on.
UPDATE "items" SET "grade" = 1
WHERE "item_def_id" IN ('raw_hide', 'raw_meat', 'raw_fish', 'herb', 'grain', 'flax', 'log', 'iron_ore', 'rough_gem');
