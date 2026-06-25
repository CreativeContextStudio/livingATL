ALTER TABLE "metadata_extracted" ADD COLUMN "brief" jsonb;--> statement-breakpoint
ALTER TABLE "metadata_extracted" ADD COLUMN "sensitivity_review" jsonb;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "content_advisory" jsonb;