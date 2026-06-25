import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Server-side Drizzle client. Uses the direct Postgres connection from
 * `DATABASE_URL`. In Phase 2 this should be swapped to the Supabase
 * transaction-pooler URL for serverless deployments (PRD §2.2).
 *
 * `prepare: false` is required when talking to Supabase's pgbouncer in
 * transaction-pooling mode.
 */
const client = postgres(databaseUrl, { prepare: false });
export const db = drizzle(client, { schema });
