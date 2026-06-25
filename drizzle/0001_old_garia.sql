CREATE TYPE "public"."recording_date_precision" AS ENUM('exact', 'month', 'year', 'decade', 'estimated');--> statement-breakpoint
CREATE TYPE "public"."speaker_role" AS ENUM('interviewee', 'interviewer', 'other');--> statement-breakpoint
CREATE TYPE "public"."transcription_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."wcs_label" AS ENUM('high', 'moderate', 'low');--> statement-breakpoint
CREATE TYPE "public"."whisper_runtime" AS ENUM('whisper.cpp', 'openai-whisper');--> statement-breakpoint
CREATE TABLE "metadata_extracted" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"neighborhoods" text[] DEFAULT '{}' NOT NULL,
	"themes" text[] DEFAULT '{}' NOT NULL,
	"date_references" jsonb,
	"locations" jsonb,
	"organizations" text[] DEFAULT '{}' NOT NULL,
	"key_quotes" jsonb,
	"historical_events" text[] DEFAULT '{}' NOT NULL,
	"sentiment_summary" text,
	"ai_summary" text,
	"modern_context_notes" text,
	"extraction_source" text DEFAULT 'claude_code_manual' NOT NULL,
	"extraction_model" text,
	"extraction_prompt_version" text,
	"extraction_date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recording_speakers" (
	"recording_id" uuid NOT NULL,
	"speaker_id" uuid NOT NULL,
	"role" "speaker_role" NOT NULL,
	CONSTRAINT "recording_speakers_recording_id_speaker_id_role_pk" PRIMARY KEY("recording_id","speaker_id","role")
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"audio_url" text,
	"audio_url_archival" text,
	"duration_seconds" integer,
	"recording_date" date,
	"recording_date_precision" "recording_date_precision",
	"catalog_number" text NOT NULL,
	"catalog_description" text,
	"catalog_notes" text,
	"collection" text,
	"publisher" text,
	"analog_format" text,
	"date_digitized" date,
	"digitized" boolean DEFAULT false NOT NULL,
	"transcription_status" "transcription_status" DEFAULT 'pending' NOT NULL,
	"wcs_score" real,
	"wcs_label" "wcs_label",
	"human_review_required" boolean DEFAULT false NOT NULL,
	"human_reviewer" text,
	"human_review_date" timestamp with time zone,
	"human_review_notes" text,
	"rights_holder" text,
	"license" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"birth_year" integer,
	"death_year" integer,
	"race" text,
	"gender" text,
	"primary_occupation" text,
	"bio_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"start_time" double precision NOT NULL,
	"end_time" double precision NOT NULL,
	"token_count" integer,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"full_text" text NOT NULL,
	"segments" jsonb NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"confidence_score" real,
	"whisper_runtime" "whisper_runtime" NOT NULL,
	"whisper_model" text NOT NULL,
	"low_confidence_segments" integer DEFAULT 0 NOT NULL,
	"low_confidence_tokens" integer,
	"hallucination_flags" integer DEFAULT 0 NOT NULL,
	"repetition_flags" integer DEFAULT 0 NOT NULL,
	"raw_whisper_output" jsonb,
	"manually_reviewed" boolean DEFAULT false NOT NULL,
	"reviewer_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metadata_extracted" ADD CONSTRAINT "metadata_extracted_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_speakers" ADD CONSTRAINT "recording_speakers_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_speakers" ADD CONSTRAINT "recording_speakers_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_chunks" ADD CONSTRAINT "transcript_chunks_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "metadata_extracted_recording_id_key" ON "metadata_extracted" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "recording_speakers_speaker_idx" ON "recording_speakers" USING btree ("speaker_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recordings_catalog_number_key" ON "recordings" USING btree ("catalog_number");--> statement-breakpoint
CREATE INDEX "recordings_transcription_status_idx" ON "recordings" USING btree ("transcription_status");--> statement-breakpoint
CREATE INDEX "recordings_recording_date_idx" ON "recordings" USING btree ("recording_date");--> statement-breakpoint
CREATE UNIQUE INDEX "speakers_name_birth_year_key" ON "speakers" USING btree ("name","birth_year");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_chunks_recording_chunk_key" ON "transcript_chunks" USING btree ("recording_id","chunk_index");--> statement-breakpoint
CREATE UNIQUE INDEX "transcripts_recording_id_key" ON "transcripts" USING btree ("recording_id");