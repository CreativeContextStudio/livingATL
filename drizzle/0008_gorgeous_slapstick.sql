CREATE TYPE "public"."report_kind" AS ENUM('correction', 'restriction', 'takedown', 'sensitive_content', 'ai_summary', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'escalated', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "moderation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" "report_status",
	"to_status" "report_status",
	"actor" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports_takedowns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "report_kind" NOT NULL,
	"recording_id" uuid,
	"catalog_number" text,
	"timestamp_seconds" integer,
	"reason" text NOT NULL,
	"relationship" text,
	"contact_name" text,
	"contact_email" text,
	"invite_id" uuid,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"steward_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_report_id_reports_takedowns_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports_takedowns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports_takedowns" ADD CONSTRAINT "reports_takedowns_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports_takedowns" ADD CONSTRAINT "reports_takedowns_invite_id_preview_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."preview_invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_log_report_idx" ON "moderation_log" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_takedowns_status_idx" ON "reports_takedowns" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_takedowns_recording_idx" ON "reports_takedowns" USING btree ("recording_id");