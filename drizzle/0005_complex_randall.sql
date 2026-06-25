-- Organizations + historical_events move from text[] of free-form strings to
-- jsonb of tagged objects ({label, category[, year]}). The old flat-string
-- data can't be mechanically cast to the new shape (category is missing),
-- so we reset to empty arrays here and let `scripts/ingest.py --all`
-- repopulate from the normalized work/metadata/*.json files.
--
-- Default must be dropped BEFORE the type flip — Postgres can't cast the
-- existing '{}'::text[] default to jsonb even via USING on the column
-- data. Drop → alter → re-add default.
ALTER TABLE "metadata_extracted"
  ALTER COLUMN "organizations" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "metadata_extracted"
  ALTER COLUMN "organizations" SET DATA TYPE jsonb USING '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "metadata_extracted"
  ALTER COLUMN "organizations" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "metadata_extracted"
  ALTER COLUMN "historical_events" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "metadata_extracted"
  ALTER COLUMN "historical_events" SET DATA TYPE jsonb USING '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "metadata_extracted"
  ALTER COLUMN "historical_events" SET DEFAULT '[]'::jsonb;