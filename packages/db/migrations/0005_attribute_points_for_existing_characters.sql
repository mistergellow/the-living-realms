-- Data migration (D33): characters created with the old D&D attributes start
-- over at 5 in every new attribute and get the 12 creation points to spend.
UPDATE "characters" SET "attribute_points" = 12;
