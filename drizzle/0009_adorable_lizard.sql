CREATE TABLE "portal_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"sig_hash" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"citations" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp with time zone,
	CONSTRAINT "portal_shares_sig_hash_unique" UNIQUE("sig_hash")
);
