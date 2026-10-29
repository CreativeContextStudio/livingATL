import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Server-side Drizzle client over postgres.js, connecting through the
 * Supabase pooler named in `DATABASE_URL`.
 *
 * Pool sizing for serverless: every function instance gets its own pool, so
 * the per-instance cap — not the total — is what has to fit the pooler's
 * client limit. postgres.js defaults to 10 connections with no idle timeout,
 * which in Supavisor *session* mode (port 5432) exhausts the pool after a
 * couple of warm instances. 4 still lets a page run its queries in parallel
 * (Browse/Map issue up to four at once); idle connections are released
 * after 20 s. Production should use the *transaction* pooler (port 6543),
 * which multiplexes clients onto a few server connections.
 *
 * `prepare: false` is required in transaction-pooling mode.
 */
function createClient(url: string) {
  return postgres(url, {
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 4),
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: "livingatl-web" },
  });
}

// Reuse one client across dev hot reloads; each reload otherwise opened a
// fresh pool and leaked the old one's connections.
const globalForDb = globalThis as typeof globalThis & {
  __livingatlPg?: ReturnType<typeof postgres>;
};
const client = globalForDb.__livingatlPg ?? createClient(databaseUrl);
if (process.env.NODE_ENV !== "production") globalForDb.__livingatlPg = client;

export const db = drizzle(client, { schema });
