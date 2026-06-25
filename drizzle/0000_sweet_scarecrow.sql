CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'contributor' NOT NULL,
	"verified_storyteller" boolean DEFAULT false NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
