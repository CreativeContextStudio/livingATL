CREATE TYPE "public"."neighborhood_geometry_kind" AS ENUM('polygon', 'multipolygon', 'line', 'buffered_line', 'point');--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"name" text PRIMARY KEY NOT NULL,
	"geometry_kind" "neighborhood_geometry_kind" NOT NULL,
	"geometry" jsonb NOT NULL,
	"source" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
