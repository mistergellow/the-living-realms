-- Data migration: characters created before the character system get the
-- default starter kit (Training Sword + Padded Tunic), equipped.
-- Their attributes default to 10 in every score (12 point-buy points).
-- gen_random_uuid() (v4) is used here; application-created rows use UUIDv7.
INSERT INTO "items" ("id", "character_id", "item_def_id", "quality", "equipped_slot", "source")
SELECT gen_random_uuid(), c."id", 'training_sword', 100, 'mainHand', 'starter'
FROM "characters" c
WHERE NOT EXISTS (SELECT 1 FROM "items" i WHERE i."character_id" = c."id");
--> statement-breakpoint
INSERT INTO "items" ("id", "character_id", "item_def_id", "quality", "equipped_slot", "source")
SELECT gen_random_uuid(), c."id", 'padded_tunic', 100, 'body', 'starter'
FROM "characters" c
WHERE NOT EXISTS (
  SELECT 1 FROM "items" i WHERE i."character_id" = c."id" AND i."item_def_id" = 'padded_tunic'
);
