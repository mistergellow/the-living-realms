-- Custom SQL migration file.
-- Request #35: the formation is now one line of 4 positions per side and a
-- party is up to 4. Runs and open lobbies built on the old 3 × 2 formation
-- (slots 0–5) are closed, without any penalty.
UPDATE "rift_runs" SET "status" = 'abandoned', "ended_at" = now(), "turn_deadline" = NULL
  WHERE "status" = 'active';--> statement-breakpoint
UPDATE "rift_lobbies" SET "status" = 'closed' WHERE "status" = 'open';
