CREATE TABLE "custom_content" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"definition" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_content_kind_ck" CHECK ("custom_content"."kind" in ('item', 'ability'))
);
--> statement-breakpoint
ALTER TABLE "custom_content" ADD CONSTRAINT "custom_content_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_content_kind_idx" ON "custom_content" USING btree ("kind","created_at");