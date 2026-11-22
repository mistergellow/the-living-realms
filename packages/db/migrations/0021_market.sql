CREATE TABLE "market_listings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"hex_q" integer NOT NULL,
	"hex_r" integer NOT NULL,
	"seller_character_id" uuid NOT NULL,
	"price" bigint NOT NULL,
	"item_def_id" text NOT NULL,
	"quality" smallint DEFAULT 100 NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"upgrade_level" smallint DEFAULT 0 NOT NULL,
	"grade" smallint,
	"specials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rune_slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text DEFAULT 'market' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_listings_price_positive" CHECK ("market_listings"."price" > 0)
);
--> statement-breakpoint
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_seller_character_id_characters_id_fk" FOREIGN KEY ("seller_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "market_listings_hex_idx" ON "market_listings" USING btree ("world_id","hex_q","hex_r");--> statement-breakpoint
CREATE INDEX "market_listings_seller_idx" ON "market_listings" USING btree ("seller_character_id");